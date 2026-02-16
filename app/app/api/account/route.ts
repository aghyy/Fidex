import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../auth";
import { AccountDelegate } from "@/types/accounts";
import { Currency } from "@/types/currencies";

const account = (prisma as unknown as { account: AccountDelegate }).account;

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
        const accounts = await account.findMany({
            where: { userId: session.user.id },
            orderBy: { name: "asc" },
            select: { id: true, name: true, accountNumber: true, color: true, icon: true, balance: true, currency: true },
        });
        return NextResponse.json({ accounts: toJsonSafe(accounts) });
    } catch (error) {
        console.error("Error fetching accounts:", error);
        return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, accountNumber, color, icon, balance } = await request.json();

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (!accountNumber || typeof accountNumber !== "string" || accountNumber.trim().length === 0) {
            return NextResponse.json({ error: "Account number is required" }, { status: 400 });
        }

        const data = {
            userId: session.user.id,
            name: String(name).trim(),
            accountNumber: String(accountNumber).trim(),
            color: color ? String(color).trim() : undefined,
            icon: icon ? String(icon).trim() : undefined,
            balance: balance !== undefined && balance !== null ? Math.round(Number(balance)) : undefined,
            currency: "EUR" as Currency,
        } as const;
        
        const created = await account.create({ data });
        
        return NextResponse.json({ account: toJsonSafe(created) }, { status: 201 });
    } catch (error: unknown) {
        const e = error as { code?: string } | undefined;
        if (e?.code === "P2002") {
          return NextResponse.json({ error: "Account already exists" }, { status: 409 });
        }
        console.error("Create account error:", error);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
}