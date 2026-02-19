import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../auth";
import { TransactionInterval, TransactionType } from "@/types/transactions";
import { RouteContext } from "@/types/api";

export const runtime = "nodejs";

function toJsonSafe<T>(value: T): T {
    if (value === null || value === undefined) return value;
    if (typeof value === "bigint") return (value.toString() as unknown) as T;
    if (Array.isArray(value)) return (value.map((v) => toJsonSafe(v)) as unknown) as T;
    if (typeof value === "object") {
        const maybeDecimal = value as unknown as { toJSON?: () => unknown; toString?: () => string };
        if (typeof maybeDecimal?.toJSON === "function") {
            return (maybeDecimal.toJSON() as unknown) as T;
        }
        if (value instanceof Date) {
            return value as T;
        }
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            result[k] = toJsonSafe(v);
        }
        return (result as unknown) as T;
    }
    return value;
}

export async function GET(
    _: Request,
    context: RouteContext
) {
    const { id } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const db = prisma as unknown as {
            transaction: {
                findUnique: (args: { where: { id: string } }) => Promise<{
                    id: string;
                    userId: string;
                    originAccountId: string;
                    targetAccountId: string;
                    amount: bigint | number;
                    type: TransactionType;
                    occurredAt: Date;
                    pending: boolean;
                } | null>;
            };
        };
        const found = await db.transaction.findUnique({
            where: { id },
        });

        if (!found) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        if (found.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ transaction: toJsonSafe(found) });
    } catch (error) {
        console.error("Error fetching transaction:", error);
        return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    context: RouteContext
) {
    const { id } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const {
            originAccountId,
            targetAccountId,
            amount,
            notes,
            interval,
            type,
            category,
            expires,
            occurredAt,
            pending,
        } = await request.json();

        const db = prisma as unknown as {
            $transaction: <T>(fn: (tx: {
                transaction: {
                    findUnique: (args: { where: { id: string } }) => Promise<{
                        id: string;
                        userId: string;
                        originAccountId: string;
                        targetAccountId: string;
                        amount: bigint | number;
                        notes: string;
                        interval: TransactionInterval;
                        type: TransactionType;
                        category: string;
                        occurredAt: Date;
                        pending: boolean;
                        expires: Date;
                    } | null>;
                    update: (args: {
                        where: { id: string };
                        data: {
                            originAccountId: string;
                            targetAccountId: string;
                            amount: bigint;
                            notes: string;
                            interval: TransactionInterval;
                            type: TransactionType;
                            category: string;
                            occurredAt: Date;
                            pending: boolean;
                            expires: Date;
                        };
                    }) => Promise<unknown>;
                };
                account: {
                    findFirst: (args: { where: { id: string; userId: string } }) => Promise<{ id: string; balance: bigint | number; currency: string } | null>;
                    update: (args: { where: { id: string }; data: { balance: bigint } }) => Promise<unknown>;
                };
                category: {
                    findFirst: (args: { where: { id: string; userId: string } }) => Promise<{ id: string } | null>;
                };
            }) => Promise<T>) => Promise<T>;
        };

        const updated = await db.$transaction(async (tx) => {
            const existing = await tx.transaction.findUnique({
                where: { id },
            });

            if (!existing) {
                throw new Error("Transaction not found");
            }
            if (existing.userId !== session.user.id) {
                throw new Error("Forbidden");
            }

            const existingAmount = typeof existing.amount === "bigint" ? existing.amount : BigInt(existing.amount);

            const oldOrigin = await tx.account.findFirst({
                where: { id: existing.originAccountId, userId: session.user.id },
            });
            if (!oldOrigin) throw new Error("Origin account not found");
            const oldOriginBalance = typeof oldOrigin.balance === "bigint" ? oldOrigin.balance : BigInt(oldOrigin.balance);

            let oldTargetBalance: bigint | null = null;
            if (existing.type === "TRANSFER") {
                const oldTarget = await tx.account.findFirst({
                    where: { id: existing.targetAccountId, userId: session.user.id },
                });
                if (!oldTarget) throw new Error("Target account not found");
                oldTargetBalance =
                    typeof oldTarget.balance === "bigint" ? oldTarget.balance : BigInt(oldTarget.balance);
            }

            // Revert existing transaction impact first, but only if already booked.
            if (!existing.pending) {
                if (existing.type === "EXPENSE") {
                    await tx.account.update({
                        where: { id: existing.originAccountId },
                        data: { balance: oldOriginBalance + existingAmount },
                    });
                } else if (existing.type === "INCOME") {
                    await tx.account.update({
                        where: { id: existing.originAccountId },
                        data: { balance: oldOriginBalance - existingAmount },
                    });
                } else {
                    await tx.account.update({
                        where: { id: existing.originAccountId },
                        data: { balance: oldOriginBalance + existingAmount },
                    });
                    await tx.account.update({
                        where: { id: existing.targetAccountId },
                        data: { balance: (oldTargetBalance as bigint) - existingAmount },
                    });
                }
            }

            const normalizedType = (type as TransactionType | undefined) ?? existing.type;
            const nextOriginId =
                originAccountId !== undefined ? String(originAccountId).trim() : existing.originAccountId;
            const requestedTargetId =
                targetAccountId !== undefined ? String(targetAccountId).trim() : existing.targetAccountId;
            const nextTargetId = normalizedType === "TRANSFER" ? requestedTargetId : nextOriginId;
            const nextAmount =
                amount !== undefined && amount !== null
                    ? BigInt(Math.round(Number(amount)))
                    : existingAmount;
            const nextCategoryId =
                category !== undefined ? String(category).trim() : existing.category;
            const nextNotes = notes !== undefined ? String(notes).trim() : existing.notes;
            const nextInterval = (interval as TransactionInterval | undefined) ?? existing.interval;
            const nextExpires = expires !== undefined ? new Date(expires) : existing.expires;
            const nextOccurredAt = occurredAt !== undefined ? new Date(occurredAt) : existing.occurredAt;
            const nextPending = pending !== undefined ? Boolean(pending) : existing.pending;
            if (Number.isNaN(nextExpires.getTime()) || Number.isNaN(nextOccurredAt.getTime())) {
                throw new Error("Invalid transaction date values");
            }

            if (normalizedType === "TRANSFER" && (!nextTargetId || nextTargetId.length === 0)) {
                throw new Error("Target account is required for transfer");
            }

            const nextOrigin = await tx.account.findFirst({
                where: { id: nextOriginId, userId: session.user.id },
            });
            if (!nextOrigin) throw new Error("Origin account not found");
            if (nextOrigin.currency !== "EUR") throw new Error("Only EUR accounts are currently supported");

            const nextTarget =
                normalizedType === "TRANSFER"
                    ? await tx.account.findFirst({
                          where: { id: nextTargetId, userId: session.user.id },
                      })
                    : nextOrigin;

            if (!nextTarget) throw new Error("Target account not found");
            if (nextTarget.currency !== "EUR") throw new Error("Only EUR accounts are currently supported");

            const categoryItem = await tx.category.findFirst({
                where: { id: nextCategoryId, userId: session.user.id },
            });
            if (!categoryItem) throw new Error("Category not found");

            const nextOriginBalance =
                typeof nextOrigin.balance === "bigint" ? nextOrigin.balance : BigInt(nextOrigin.balance);
            const nextTargetBalance =
                typeof nextTarget.balance === "bigint" ? nextTarget.balance : BigInt(nextTarget.balance);

            // Apply new transaction impact only if it should be booked.
            if (!nextPending) {
                if (normalizedType === "EXPENSE") {
                    await tx.account.update({
                        where: { id: nextOriginId },
                        data: { balance: nextOriginBalance - nextAmount },
                    });
                } else if (normalizedType === "INCOME") {
                    await tx.account.update({
                        where: { id: nextOriginId },
                        data: { balance: nextOriginBalance + nextAmount },
                    });
                } else {
                    await tx.account.update({
                        where: { id: nextOriginId },
                        data: { balance: nextOriginBalance - nextAmount },
                    });
                    await tx.account.update({
                        where: { id: nextTargetId },
                        data: { balance: nextTargetBalance + nextAmount },
                    });
                }
            }

            return tx.transaction.update({
                where: { id },
                data: {
                    originAccountId: nextOriginId,
                    targetAccountId: nextTargetId,
                    amount: nextAmount,
                    notes: nextNotes,
                    interval: nextInterval,
                    type: normalizedType,
                    category: nextCategoryId,
                    occurredAt: nextOccurredAt,
                    pending: nextPending,
                    expires: nextExpires,
                },
            });
        });

        return NextResponse.json({ transaction: toJsonSafe(updated) });
    } catch (error) {
        console.error("Error updating transaction:", error);
        const message = error instanceof Error ? error.message : "Failed to update transaction";
        const status =
            message === "Transaction not found"
                ? 404
                : message === "Forbidden"
                ? 403
                : message.includes("not found") ||
                  message.includes("required") ||
                  message.includes("Only EUR") ||
                  message.includes("Invalid transaction date values")
                ? 400
                : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(
    _: Request,
    context: RouteContext
) {
    const { id } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const db = prisma as unknown as {
            $transaction: <T>(fn: (tx: {
                transaction: {
                    findUnique: (args: { where: { id: string } }) => Promise<{
                        id: string;
                        userId: string;
                        originAccountId: string;
                        targetAccountId: string;
                        amount: bigint | number;
                        type: TransactionType;
                        pending: boolean;
                    } | null>;
                    delete: (args: { where: { id: string } }) => Promise<unknown>;
                };
                account: {
                    findFirst: (args: { where: { id: string; userId: string } }) => Promise<{ id: string; balance: bigint | number } | null>;
                    update: (args: { where: { id: string }; data: { balance: bigint } }) => Promise<unknown>;
                };
            }) => Promise<T>) => Promise<T>;
        };

        await db.$transaction(async (tx) => {
            const existing = await tx.transaction.findUnique({
                where: { id },
            });

            if (!existing) {
                throw new Error("Transaction not found");
            }

            if (existing.userId !== session.user.id) {
                throw new Error("Forbidden");
            }

            const amount = typeof existing.amount === "bigint" ? existing.amount : BigInt(existing.amount);

            const origin = await tx.account.findFirst({
                where: { id: existing.originAccountId, userId: session.user.id },
            });
            if (!origin) throw new Error("Origin account not found");
            const originBalance = typeof origin.balance === "bigint" ? origin.balance : BigInt(origin.balance);

            if (!existing.pending) {
                if (existing.type === "EXPENSE") {
                    await tx.account.update({
                        where: { id: existing.originAccountId },
                        data: { balance: originBalance + amount },
                    });
                } else if (existing.type === "INCOME") {
                    await tx.account.update({
                        where: { id: existing.originAccountId },
                        data: { balance: originBalance - amount },
                    });
                } else {
                    const target = await tx.account.findFirst({
                        where: { id: existing.targetAccountId, userId: session.user.id },
                    });
                    if (!target) throw new Error("Target account not found");
                    const targetBalance = typeof target.balance === "bigint" ? target.balance : BigInt(target.balance);

                    await tx.account.update({
                        where: { id: existing.originAccountId },
                        data: { balance: originBalance + amount },
                    });
                    await tx.account.update({
                        where: { id: existing.targetAccountId },
                        data: { balance: targetBalance - amount },
                    });
                }
            }

            await tx.transaction.delete({
                where: { id },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        const message = error instanceof Error ? error.message : "Failed to delete transaction";
        const status = message === "Transaction not found" ? 404 : message === "Forbidden" ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
