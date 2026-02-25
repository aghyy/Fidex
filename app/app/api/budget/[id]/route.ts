import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "../../../../auth";
import { getActualSpent } from "../../../../lib/budget";
import type { RouteContext } from "@/types/api";
import type { BudgetDelegate } from "@/types/budgets";

const budget = (prisma as unknown as { budget: BudgetDelegate }).budget;

export const runtime = "nodejs";

function toNumber(value: bigint): number {
  return Number(value);
}

/** GET /api/budget/[id] – get one budget with actual spent. Query: from, to for period. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const budgetRow = await budget.findFirst({
    where: { id, userId: session.user.id },
    include: { categories: { select: { id: true } } },
  });

  if (!budgetRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const categoryIds = budgetRow.categories.map((c) => c.id);
    const url = new URL(_request.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    const validFrom = from && !Number.isNaN(from.getTime()) ? from : undefined;
    const validTo = to && !Number.isNaN(to.getTime()) ? to : undefined;

    const actual = await getActualSpent(session.user.id, categoryIds, {
      from: validFrom,
      to: validTo,
    });

    return NextResponse.json({
      budget: {
        id: budgetRow.id,
        name: budgetRow.name,
        targetAmount: toNumber(budgetRow.targetAmount),
        categoryIds,
        actualAmount: toNumber(actual),
        createdAt: budgetRow.createdAt,
        updatedAt: budgetRow.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get budget error:", error);
    return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
  }
}

/** PATCH /api/budget/[id] – update budget. */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await budget.findFirst({
    where: { id, userId: session.user.id },
    include: { categories: { select: { id: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const updates: {
      name?: string | null;
      targetAmount?: bigint;
      categories?: { set: { id: string }[] };
    } = {};

    if (body?.name !== undefined) {
      updates.name = typeof body.name === "string" ? body.name.trim() || null : null;
    }
    if (
      body?.targetAmount !== undefined &&
      typeof body.targetAmount === "number" &&
      Number.isFinite(body.targetAmount) &&
      body.targetAmount >= 0
    ) {
      updates.targetAmount = BigInt(Math.round(body.targetAmount));
    }
    if (Array.isArray(body?.categoryIds)) {
      const categoryIds = (body.categoryIds as unknown[]).filter(
        (id): id is string => typeof id === "string"
      );
      if (categoryIds.length === 0) {
        return NextResponse.json(
          { error: "At least one category is required" },
          { status: 400 }
        );
      }
      const categoryIdsUnique = [...new Set(categoryIds)];
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIdsUnique }, userId: session.user.id },
        select: { id: true },
      });
      const foundIds = new Set(categories.map((c) => c.id));
      const missing = categoryIdsUnique.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Categories not found or not owned: ${missing.join(", ")}` },
          { status: 400 }
        );
      }
      updates.categories = { set: categoryIdsUnique.map((id) => ({ id })) };
    }

    const updatedRow = await budget.update({
      where: { id },
      data: updates,
      include: { categories: { select: { id: true } } },
    });

    const categoryIds = updatedRow.categories.map((c) => c.id);
    const actual = await getActualSpent(session.user.id, categoryIds);

    return NextResponse.json({
      budget: {
        id: updatedRow.id,
        name: updatedRow.name,
        targetAmount: toNumber(updatedRow.targetAmount),
        categoryIds,
        actualAmount: toNumber(actual),
        createdAt: updatedRow.createdAt,
        updatedAt: updatedRow.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update budget error:", error);
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }
}

/** DELETE /api/budget/[id] – delete budget. */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await budget.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete budget error:", error);
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
  }
}
