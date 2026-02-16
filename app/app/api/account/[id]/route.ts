import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../auth";
import { AccountDelegate, AccountRecord } from "@/types/accounts";
import { RouteContext } from "@/types/api";
import { Currency } from "@/types/currencies";

export const runtime = "nodejs";

const account = (prisma as unknown as { account: AccountDelegate }).account;

function normalizeAccount(record: AccountRecord) {
    const { id, name, accountNumber, color, icon, balance, currency } = record as AccountRecord & {
        balance: number | bigint;
    };
    return {
        id,
        name,
        accountNumber,
        color,
        icon,
        balance: typeof balance === "bigint" ? Number(balance) : balance,
        currency,
    };
}

export async function GET(_: Request, context: RouteContext) {
    const { id: accountId } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const item = await account.findUnique({ where: { id: accountId, userId: session.user.id } });
        if (!item) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }
        return NextResponse.json({ account: normalizeAccount(item) }, { status: 200 });
    } catch (error) {
        console.error("Error fetching account:", error);
        return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    const { id: accountId } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const data: Partial<{ name: string; accountNumber: string; color: string; icon: string; balance: number; currency: Currency }> = {};

        if (typeof body?.name === "string") data.name = body.name.trim();
        if (typeof body?.accountNumber === "string") data.accountNumber = body.accountNumber.trim();
        if (typeof body?.color === "string") data.color = body.color.trim();
        if (typeof body?.icon === "string") data.icon = body.icon.trim();
        if (typeof body?.balance === "number") data.balance = body.balance;
        if (typeof body?.currency === "string") data.currency = body.currency;

        // Ensure ownership
        const item = await account.findUnique({ where: { id: accountId, userId: session.user.id } });
        if (!item) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        const updated = await account.update({ where: { id: accountId, userId: session.user.id }, data });
        return NextResponse.json({ account: normalizeAccount(updated as AccountRecord) }, { status: 200 });
    } catch (error: unknown) {
        const e = error as { code?: string } | undefined;
        if (e?.code === "P2002") {
          return NextResponse.json({ error: "Account already exists" }, { status: 409 });
        }
        console.error("Update account error:", error);
        return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    const { id: accountId } = await context.params;
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Ensure ownership
        const item = await account.findUnique({ where: { id: accountId, userId: session.user.id } });
        if (!item) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        await account.delete({ where: { id: accountId, userId: session.user.id } });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error deleting account:", error);
        return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }
}