import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../auth";
import { TransactionInterval, TransactionType } from "@/types/transactions";

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

export async function GET(request: Request) {
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const accountId = searchParams.get("accountId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const includePendingParam = searchParams.get("includePending");
    const includePending = includePendingParam === null ? true : includePendingParam === "true";
    const pendingOnly = searchParams.get("pendingOnly") === "true";

    try {
        const db = prisma as unknown as {
            transaction: {
                findMany: (args: {
                    where: {
                        userId: string;
                        category?: string;
                        OR?: Array<{ originAccountId: string } | { targetAccountId: string }>;
                        occurredAt?: {
                            gte?: Date;
                            lte?: Date;
                        };
                        pending?: boolean;
                    };
                    orderBy: { occurredAt: "asc" | "desc" };
                }) => Promise<unknown[]>;
            };
        };

        const where: {
            userId: string;
            category?: string;
            OR?: Array<{ originAccountId: string } | { targetAccountId: string }>;
            occurredAt?: {
                gte?: Date;
                lte?: Date;
            };
            pending?: boolean;
        } = { userId: session.user.id };

        if (category) where.category = category;
        if (accountId) {
            where.OR = [{ originAccountId: accountId }, { targetAccountId: accountId }];
        }
        if (pendingOnly) {
            where.pending = true;
        } else if (!includePending) {
            where.pending = false;
        }
        if (from || to) {
            const dateFilter: { gte?: Date; lte?: Date } = {};
            if (from) {
                const parsedFrom = new Date(from);
                if (!Number.isNaN(parsedFrom.getTime())) dateFilter.gte = parsedFrom;
            }
            if (to) {
                const parsedTo = new Date(to);
                if (!Number.isNaN(parsedTo.getTime())) dateFilter.lte = parsedTo;
            }
            if (dateFilter.gte || dateFilter.lte) {
                where.occurredAt = dateFilter;
            }
        }

        const transactions = await db.transaction.findMany({
            where,
            orderBy: { occurredAt: "desc" },
        });

        return NextResponse.json({ transactions: toJsonSafe(transactions) });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}

export async function POST(request: Request) {
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
        const normalizedType = (type as TransactionType | undefined) ?? "EXPENSE";
        const isPending = Boolean(pending);

        if (!originAccountId || typeof originAccountId !== "string") {
            return NextResponse.json({ error: "Account is required" }, { status: 400 });
        }

        if (amount === undefined || amount === null || typeof amount !== "number" || amount <= 0) {
            return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
        }

        if (!category || typeof category !== "string") {
            return NextResponse.json({ error: "Category is required" }, { status: 400 });
        }

        if (normalizedType === "TRANSFER" && (!targetAccountId || typeof targetAccountId !== "string")) {
            return NextResponse.json({ error: "Target account is required for transfer" }, { status: 400 });
        }

        const amountBigInt = BigInt(Math.round(amount));
        const expiresDate = expires
            ? new Date(expires)
            : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
        const occurredAtDate = occurredAt ? new Date(occurredAt) : new Date();
        if (Number.isNaN(expiresDate.getTime()) || Number.isNaN(occurredAtDate.getTime())) {
            return NextResponse.json({ error: "Invalid transaction date values" }, { status: 400 });
        }
        const originId = String(originAccountId).trim();
        const categoryId = String(category).trim();

        const db = prisma as unknown as {
            $transaction: <T>(fn: (tx: {
                account: {
                    findFirst: (args: { where: { id: string; userId: string } }) => Promise<{ id: string; balance: bigint | number; currency: string } | null>;
                    update: (args: { where: { id: string }; data: { balance: bigint } }) => Promise<unknown>;
                };
                category: {
                    findFirst: (args: { where: { id: string; userId: string } }) => Promise<{ id: string } | null>;
                };
                transaction: {
                    create: (args: {
                        data: {
                            userId: string;
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
            }) => Promise<T>) => Promise<T>;
        };

        const created = await db.$transaction(async (tx) => {
            const origin = await tx.account.findFirst({ where: { id: originId, userId: session.user.id } });
            if (!origin) throw new Error("Origin account not found");
            if (origin.currency !== "EUR") throw new Error("Only EUR accounts are currently supported");

            const existingCategory = await tx.category.findFirst({ where: { id: categoryId, userId: session.user.id } });
            if (!existingCategory) throw new Error("Category not found");

            const resolvedTargetId =
                normalizedType === "TRANSFER"
                    ? String(targetAccountId).trim()
                    : originId;

            const target =
                normalizedType === "TRANSFER"
                    ? await tx.account.findFirst({ where: { id: resolvedTargetId, userId: session.user.id } })
                    : origin;

            if (!target) throw new Error("Target account not found");
            if (target.currency !== "EUR") throw new Error("Only EUR accounts are currently supported");

            const originBalance = typeof origin.balance === "bigint" ? origin.balance : BigInt(origin.balance);
            const targetBalance = typeof target.balance === "bigint" ? target.balance : BigInt(target.balance);

            const createdTx = await tx.transaction.create({
                data: {
                    userId: session.user.id,
                    originAccountId: originId,
                    targetAccountId: resolvedTargetId,
                    amount: amountBigInt,
                    notes: notes ? String(notes).trim() : "",
                    interval: (interval as TransactionInterval) ?? "ONCE",
                    type: normalizedType,
                    category: categoryId,
                    occurredAt: occurredAtDate,
                    pending: isPending,
                    expires: expiresDate,
                },
            });

            if (!isPending) {
                if (normalizedType === "EXPENSE") {
                    await tx.account.update({
                        where: { id: originId },
                        data: { balance: originBalance - amountBigInt },
                    });
                } else if (normalizedType === "INCOME") {
                    await tx.account.update({
                        where: { id: originId },
                        data: { balance: originBalance + amountBigInt },
                    });
                } else {
                    await tx.account.update({
                        where: { id: originId },
                        data: { balance: originBalance - amountBigInt },
                    });
                    await tx.account.update({
                        where: { id: resolvedTargetId },
                        data: { balance: targetBalance + amountBigInt },
                    });
                }
            }

            return createdTx;
        });

        return NextResponse.json({ transaction: toJsonSafe(created) }, { status: 201 });
    } catch (error: unknown) {
        console.error("Create transaction error:", error);
        const message = error instanceof Error ? error.message : "Failed to create transaction";
        const isValidationError =
            message.includes("required") ||
            message.includes("not found") ||
            message.includes("Only EUR") ||
            message.includes("Invalid transaction date values");
        return NextResponse.json({ error: message }, { status: isValidationError ? 400 : 500 });
    }
}
