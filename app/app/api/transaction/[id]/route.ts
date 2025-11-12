import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../auth";
import { TransactionInterval, TransactionType } from "@/types/transaction";
import { Context } from "vm";


export const runtime = "nodejs";

type TransactionRecord = {
    id: string;
    categoryId: string;
    originAccountId: string;
    targetAccountId: string;
    amount: number;
    notes: string;
    interval: TransactionInterval;
    type: TransactionType;
};

type TransactionDelegate = {
    findFirst: (args: {
      where: { id?: string; userId: string };
      orderBy?: { name: "asc" | "desc" };
      select?: { id?: true; userId?: true; categoryId?: true };
    }) => Promise<TransactionRecord[]>;
    update: (args: {
      where: { id: string };
      data: {
        categoryId: string;
        originAccountId: string;
        targetAccountId: string;
        amount: number;
        notes: string;
        interval: TransactionInterval;
        type: TransactionType;
      }
    }) => Promise<TransactionRecord>;
    delete: (args: {
        where: { id: string }
    }) => Promise<TransactionRecord>;
};

const transaction = (prisma as unknown as { transaction: TransactionDelegate }).transaction;

export async function GET(_ : Request, ctx: unknown) {
  const { params } = ctx as { params: { id: string } };
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const item = await transaction.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { id, categoryId, originAccountId, targetAccountId, amount, notes, interval, type} = item;
    return NextResponse.json({ transaction: { id, categoryId, originAccountId, targetAccountId, amount, notes, interval, type } }, { status: 200 })
  } catch (error) {
    console.log("Get transaction error:", error)
    return NextResponse.json( {error: "Failed to fetch transaction" }, { status: 500});
  }
}

export async function PATCH(request: Request, ctx: unknown) {
  const { params } = ctx as { params: { id: string } };
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data: Partial<{ categoryId: string; originAccountId: string; targetAccountId: string; amount: number; notes: string; interval: TransactionInterval; type: TransactionType }> = {};
    if (typeof body?.categoryId === "string") data.categoryId = body.categoryId.trim();
    if (typeof body?.originAccountId === "string") data.originAccountId = body.originAccountId.trim();
    if (typeof body?.targetAccountId === "string") data.targetAccountId = body.targetAccountId.trim();
    if (typeof body?.notes === "string") data.notes = body.notes.trim();

    // Ensure ownership
    const item = await transaction.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await transaction.update({ where: { id: params.id }, data });
    const { id, categoryId, originAccountId, targetAccountId, amount, notes, interval, type} = updated;
    return NextResponse.json({ transaction: {id, categoryId, originAccountId, targetAccountId, amount, notes, interval, type } }, {status: 200})
  } catch (error: unknown) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: unknown) {
  const { params } = ctx as { params: { id: string } };
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure ownership
    const item = await transaction.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await transaction.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}