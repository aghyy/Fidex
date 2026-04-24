import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../auth";
import { TransactionInterval, TransactionType } from "@/types/transactions";
import { RouteContext } from "@/types/api";
import { parseMoneyInput, toMoneyNumber } from "@/lib/money";
import {
    computeNextOccurrence,
    materializeSingleTemplate,
} from "@/lib/recurring-transactions";

export const runtime = "nodejs";

function toJsonSafe<T>(value: T): T {
    if (value === null || value === undefined) return value;
    if (typeof value === "bigint") return (value.toString() as unknown) as T;
    if (Array.isArray(value)) return (value.map((v) => toJsonSafe(v)) as unknown) as T;
    if (typeof value === "object") {
        const maybeDecimal = value as unknown as { toJSON?: () => unknown };
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

type RecurringRecord = {
    id: string;
    userId: string;
    originAccountId: string;
    targetAccountId: string;
    amount: number | string;
    notes: string;
    interval: TransactionInterval;
    type: TransactionType;
    category: string;
    startDate: Date;
    endDate: Date | null;
    nextOccurrenceAt: Date;
    lastOccurrenceAt: Date | null;
    active: boolean;
};

export async function GET(_: Request, context: RouteContext) {
    const { id } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const db = prisma as unknown as {
            recurringTransaction: {
                findUnique: (args: { where: { id: string } }) => Promise<RecurringRecord | null>;
            };
        };
        const found = await db.recurringTransaction.findUnique({ where: { id } });
        if (!found) {
            return NextResponse.json({ error: "Recurring transaction not found" }, { status: 404 });
        }
        if (found.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json({ recurringTransaction: toJsonSafe(found) });
    } catch (error) {
        console.error("Error fetching recurring transaction:", error);
        return NextResponse.json(
            { error: "Failed to fetch recurring transaction" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json()) as {
            originAccountId?: string;
            targetAccountId?: string;
            amount?: unknown;
            notes?: string;
            interval?: TransactionInterval;
            type?: TransactionType;
            category?: string;
            startDate?: string;
            endDate?: string | null;
            active?: boolean;
        };

        const updated = await prisma.$transaction(async (tx) => {
            const existing = (await tx.recurringTransaction.findUnique({ where: { id } })) as RecurringRecord | null;
            if (!existing) throw new Error("Recurring transaction not found");
            if (existing.userId !== session.user.id) throw new Error("Forbidden");

            const nextType = body.type ?? existing.type;
            const nextInterval = body.interval ?? existing.interval;
            if (nextInterval === "ONCE") {
                throw new Error("Recurring transactions cannot have interval ONCE");
            }

            const nextOriginId = body.originAccountId
                ? String(body.originAccountId).trim()
                : existing.originAccountId;
            const requestedTargetId = body.targetAccountId
                ? String(body.targetAccountId).trim()
                : existing.targetAccountId;
            const nextTargetId = nextType === "TRANSFER" ? requestedTargetId : nextOriginId;

            const nextAmount =
                body.amount !== undefined && body.amount !== null
                    ? parseMoneyInput(body.amount, { min: 0.01 })
                    : toMoneyNumber(existing.amount);
            if (nextAmount === null) throw new Error("Valid amount is required");

            const nextCategoryId = body.category ? String(body.category).trim() : existing.category;
            const nextNotes = body.notes !== undefined ? String(body.notes).trim() : existing.notes;
            const nextStartDate = body.startDate ? new Date(body.startDate) : existing.startDate;
            const nextEndDate = body.endDate === null
                ? null
                : body.endDate !== undefined
                    ? new Date(body.endDate)
                    : existing.endDate;
            const nextActive = body.active !== undefined ? Boolean(body.active) : existing.active;

            if (Number.isNaN(nextStartDate.getTime())) throw new Error("Invalid start date");
            if (nextEndDate && Number.isNaN(nextEndDate.getTime())) {
                throw new Error("Invalid end date");
            }

            // Validate related records exist and belong to user.
            const origin = await tx.account.findFirst({
                where: { id: nextOriginId, userId: session.user.id },
            });
            if (!origin) throw new Error("Origin account not found");
            if (origin.currency !== "EUR") throw new Error("Only EUR accounts are currently supported");

            if (nextType === "TRANSFER") {
                const target = await tx.account.findFirst({
                    where: { id: nextTargetId, userId: session.user.id },
                });
                if (!target) throw new Error("Target account not found");
                if (target.currency !== "EUR") throw new Error("Only EUR accounts are currently supported");
            }

            const categoryItem = await tx.category.findFirst({
                where: { id: nextCategoryId, userId: session.user.id },
            });
            if (!categoryItem) throw new Error("Category not found");

            // Recompute nextOccurrenceAt if the start date changed.
            let nextOccurrenceAt = existing.nextOccurrenceAt;
            if (nextStartDate.getTime() !== existing.startDate.getTime()) {
                nextOccurrenceAt = nextStartDate;
                if (existing.lastOccurrenceAt) {
                    // Advance to the next slot after the last recorded occurrence
                    // to avoid re-materializing past events.
                    while (
                        nextOccurrenceAt.getTime() <= existing.lastOccurrenceAt.getTime()
                    ) {
                        nextOccurrenceAt = computeNextOccurrence(
                            nextOccurrenceAt,
                            nextInterval
                        );
                    }
                }
            }

            const result = await tx.recurringTransaction.update({
                where: { id },
                data: {
                    originAccountId: nextOriginId,
                    targetAccountId: nextTargetId,
                    amount: nextAmount,
                    notes: nextNotes,
                    interval: nextInterval,
                    type: nextType,
                    category: nextCategoryId,
                    startDate: nextStartDate,
                    endDate: nextEndDate,
                    nextOccurrenceAt,
                    active: nextActive,
                },
            });

            return result;
        });

        return NextResponse.json({ recurringTransaction: toJsonSafe(updated) });
    } catch (error) {
        console.error("Error updating recurring transaction:", error);
        const message = error instanceof Error ? error.message : "Failed to update";
        const status =
            message === "Recurring transaction not found"
                ? 404
                : message === "Forbidden"
                    ? 403
                    : message.includes("required") ||
                        message.includes("not found") ||
                        message.includes("Only EUR") ||
                        message.includes("Invalid")
                        ? 400
                        : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(_: Request, context: RouteContext) {
    const { id } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.$transaction(async (tx) => {
            const existing = (await tx.recurringTransaction.findUnique({
                where: { id },
            })) as RecurringRecord | null;
            if (!existing) throw new Error("Recurring transaction not found");
            if (existing.userId !== session.user.id) throw new Error("Forbidden");

            await tx.recurringTransaction.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting recurring transaction:", error);
        const message = error instanceof Error ? error.message : "Failed to delete";
        const status =
            message === "Recurring transaction not found"
                ? 404
                : message === "Forbidden"
                    ? 403
                    : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * Manually trigger materialization for a single template. Useful for running
 * "catch-up" from the UI after changing schedule fields.
 */
export async function POST(_: Request, context: RouteContext) {
    const { id } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const result = await prisma.$transaction(async (tx) => {
            const existing = (await tx.recurringTransaction.findUnique({
                where: { id },
            })) as RecurringRecord | null;
            if (!existing) throw new Error("Recurring transaction not found");
            if (existing.userId !== session.user.id) throw new Error("Forbidden");

            return materializeSingleTemplate(
                tx as unknown as Parameters<typeof materializeSingleTemplate>[0],
                {
                    id: existing.id,
                    userId: existing.userId,
                    originAccountId: existing.originAccountId,
                    targetAccountId: existing.targetAccountId,
                    amount: toMoneyNumber(existing.amount),
                    notes: existing.notes,
                    interval: existing.interval,
                    type: existing.type,
                    category: existing.category,
                    startDate: existing.startDate,
                    endDate: existing.endDate,
                    nextOccurrenceAt: existing.nextOccurrenceAt,
                    lastOccurrenceAt: existing.lastOccurrenceAt,
                    active: existing.active,
                },
                now
            );
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("Error triggering recurring transaction:", error);
        const message = error instanceof Error ? error.message : "Failed to trigger";
        const status =
            message === "Recurring transaction not found"
                ? 404
                : message === "Forbidden"
                    ? 403
                    : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
