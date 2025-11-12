import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../auth";
import { TransactionDelegate} from "@/types/transaction";
import { TransactionInterval, TransactionType } from "@/types/transaction";
import { RouteContext } from "@/types/api";

export const runtime = "nodejs";

const transaction = (prisma as unknown as { transaction: TransactionDelegate }).transaction;

export async function GET(_ : Request, context: RouteContext) {
  const { id: transactionId } = await context.params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const item = await transaction.findFirst({ where: { id: transactionId, userId: session.user.id } });
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

export async function PATCH(request: Request, context: RouteContext) {
  const { id: transactionId } = await context.params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = {};
    // Ensure ownership
    const item = await transaction.findFirst({ where: { id: transactionId, userId: session.user.id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await transaction.update({ where: { id: transactionId }, data });
    const { id, categoryId, originAccountId, targetAccountId, amount, notes, interval, type} = updated;
    return NextResponse.json({ transaction: {id, categoryId, originAccountId, targetAccountId, amount, notes, interval, type } }, {status: 200})
  } catch (error: unknown) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id: transactionId } = await context.params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure ownership
    const item = await transaction.findFirst({ where: { id: transactionId, userId: session.user.id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await transaction.delete({ where: { id: transactionId } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}