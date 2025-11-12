import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../auth";
import { TransactionDelegate } from "@/types/transaction"

const transaction = (prisma as unknown as { transaction: TransactionDelegate }).transaction;

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const transactions = await transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, categoryId: true },
    });
    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error: unknown) {
    console.error("List transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { categoryId, originAccountId, targetAccountId, amount, notes, interval, type } = await request.json();

    if (!originAccountId || originAccountId.trim().length === 0 && type === "TRANSFER" || "EXPENSE") {
      return NextResponse.json({ error: "Account of origin is required" }, { status: 400 });
    }

    if (!targetAccountId || targetAccountId.trim().length === 0 && type === "TRANSFER" || "INCOME") {
      return NextResponse.json({ error: "Target Account is required" }, { status: 400 });
    }
    
    const data = {
      userId: session.user.id,
      categoryId: categoryId ? String(categoryId).trim() : undefined,
      originAccountId: String(originAccountId).trim(),
      targetAccountId: String(targetAccountId).trim(),
      amount: Number(amount),
      notes: notes ? String(notes).trim() : undefined,
      interval: interval,
      type: type,
    } as const;
    
    const created = await transaction.create({ data });
    
    return NextResponse.json({ transaction: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
