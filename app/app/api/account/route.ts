import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../auth";

type AccountRecord = { id: string; name: string; accountNumber: string; color: string | null; icon: string | null; balance: number };
type AccountDelegate = {
    findMany: (args: {
      where: { userId: string };
      orderBy?: { name: "asc" | "desc" };
      select?: { id?: true; name?: true; accountNumber?: true; color?: true; icon?: true; balance?: true };
    }) => Promise<AccountRecord[]>;
    create: (args: {
      data: { userId: string; name: string; accountNumber: string; color?: string; icon?: string; balance?: number };
    }) => Promise<AccountRecord>;
};

const account = (prisma as unknown as { account: AccountDelegate }).account;

export const runtime = "nodejs";

export async function GET() {
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const accounts = await account.findMany({
            where: { userId: session.user.id },
            orderBy: { name: "asc" },
            select: { id: true, name: true, accountNumber: true, color: true, icon: true, balance: true },
        });
        return NextResponse.json({ accounts });
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
            balance: balance ? Number(balance) : undefined,
        } as const;

        console.log(data);
        
        const created = await account.create({ data });
        
        return NextResponse.json({ account : created }, { status: 201 });
    } catch (error: unknown) {
        const e = error as { code?: string } | undefined;
        if (e?.code === "P2002") {
          return NextResponse.json({ error: "Account already exists" }, { status: 409 });
        }
        console.error("Create category error:", error);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
}