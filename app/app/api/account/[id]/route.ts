import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../auth";
import { AccountDelegate, AccountRecord } from "@/types/accounts";

export const runtime = "nodejs";

const account = (prisma as unknown as { account: AccountDelegate }).account;

export async function GET(_: Request, ctx : unknown) {
    const { params } = ctx as { params: { id: string } };
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const item = await account.findUnique({ where: { id: params.id, userId: session.user.id } });
        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }
        const { id, name, accountNumber, color, icon, balance } = item as AccountRecord;
        return NextResponse.json({ account : { id, name, accountNumber, color, icon, balance } }, { status: 200 });
    } catch (error) {
        console.error("Error fetching account:", error);
        return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
    }
}

export async function PATCH(request: Request, ctx : unknown) {
    const { params } = ctx as { params: { id: string } };
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const data: Partial<{ name: string; accountNumber: string; color: string; icon: string; balance: number }> = {};

        if (typeof body?.name === "string") data.name = body.name.trim();
        if (typeof body?.accountNumber === "string") data.accountNumber = body.accountNumber.trim();
        if (typeof body?.color === "string") data.color = body.color.trim();
        if (typeof body?.icon === "string") data.icon = body.icon.trim();
        if (typeof body?.balance === "number") data.balance = body.balance;

        // Ensure ownership
        const item = await account.findUnique({ where: { id: params.id, userId: session.user.id } });
        if (!item) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        const updated = await account.update({ where: { id: params.id, userId: session.user.id }, data });
        const { id, name, accountNumber, color, icon, balance } = updated as AccountRecord;
        NextResponse.json({ account : { id, name, accountNumber, color, icon, balance } }, { status: 200 });
    } catch (error: unknown) {
        const e = error as { code?: string } | undefined;
        if (e?.code === "P2002") {
          return NextResponse.json({ error: "Account already exists" }, { status: 409 });
        }
        console.error("Update category error:", error);
        return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
    }
}

export async function DELETE(request: Request, ctx : unknown) {
    const { params } = ctx as { params: { id: string } };
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Ensure ownership
        const item = await account.findUnique({ where: { id: params.id, userId: session.user.id } });
        if (!item) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        await account.delete({ where: { id: params.id, userId: session.user.id } });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error deleting account:", error);
        return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }
}