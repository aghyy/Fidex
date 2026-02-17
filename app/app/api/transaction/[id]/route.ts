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
        const db = prisma as unknown as {
            transaction: {
                findUnique: (args: { where: { id: string } }) => Promise<{
                    id: string;
                    userId: string;
                } | null>;
                update: (args: {
                    where: { id: string };
                    data: {
                        originAccountId?: string;
                        targetAccountId?: string;
                        amount?: bigint;
                        notes?: string;
                        interval?: TransactionInterval;
                        type?: TransactionType;
                        category?: string;
                        expires?: Date;
                    };
                }) => Promise<unknown>;
            };
        };

        const existing = await db.transaction.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        if (existing.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { originAccountId, targetAccountId, amount, notes, interval, type, category, expires } = await request.json();

        const data: {
            originAccountId?: string;
            targetAccountId?: string;
            amount?: bigint;
            notes?: string;
            interval?: TransactionInterval;
            type?: TransactionType;
            category?: string;
            expires?: Date;
        } = {};

        if (originAccountId !== undefined) data.originAccountId = String(originAccountId).trim();
        if (targetAccountId !== undefined) data.targetAccountId = String(targetAccountId).trim();
        if (amount !== undefined && amount !== null) data.amount = BigInt(Math.round(amount * 100));
        if (notes !== undefined) data.notes = String(notes).trim();
        if (interval !== undefined) data.interval = interval as TransactionInterval;
        if (type !== undefined) data.type = type as TransactionType;
        if (category !== undefined) data.category = String(category).trim();
        if (expires !== undefined) data.expires = new Date(expires);

        const updated = await db.transaction.update({
            where: { id },
            data,
        });

        return NextResponse.json({ transaction: toJsonSafe(updated) });
    } catch (error) {
        console.error("Error updating transaction:", error);
        return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
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
