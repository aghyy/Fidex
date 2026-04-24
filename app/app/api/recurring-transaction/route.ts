import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../auth";

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

export async function GET() {
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const db = prisma as unknown as {
            recurringTransaction: {
                findMany: (args: {
                    where: { userId: string };
                    orderBy: { createdAt: "desc" };
                }) => Promise<unknown[]>;
            };
        };

        const recurringTransactions = await db.recurringTransaction.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            recurringTransactions: toJsonSafe(recurringTransactions),
        });
    } catch (error) {
        console.error("Error fetching recurring transactions:", error);
        return NextResponse.json(
            { error: "Failed to fetch recurring transactions" },
            { status: 500 }
        );
    }
}
