import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../auth";
import { getActualSpent } from "../../../lib/budget";
import type { BudgetDelegate } from "@/types/budgets";

const budget = (prisma as unknown as { budget: BudgetDelegate }).budget;

export const runtime = "nodejs";

function toNumber(value: bigint): number {
  return Number(value);
}

/** GET /api/budget – list all budgets for the current user, with actual spent. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;
  const validFrom = from && !Number.isNaN(from.getTime()) ? from : undefined;
  const validTo = to && !Number.isNaN(to.getTime()) ? to : undefined;

  try {
    const budgets = await budget.findMany({
      where: { userId: session.user.id },
      include: { categories: { select: { id: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const result = await Promise.all(
      budgets.map(async (b) => {
        const categoryIds = b.categories.map((c) => c.id);
        const actual = await getActualSpent(session.user!.id, categoryIds, {
          from: validFrom,
          to: validTo,
        });
        return {
          id: b.id,
          name: b.name,
          targetAmount: toNumber(b.targetAmount),
          categoryIds,
          actualAmount: toNumber(actual),
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        };
      })
    );

    return NextResponse.json({ budgets: result });
  } catch (error) {
    console.error("List budgets error:", error);
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}

/** POST /api/budget – create a budget. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = body?.name != null ? String(body.name).trim() || null : null;
    const targetAmount = body?.targetAmount;
    const categoryIds = Array.isArray(body?.categoryIds)
      ? (body.categoryIds as unknown[]).filter((id): id is string => typeof id === "string")
      : [];

    if (
      targetAmount == null ||
      typeof targetAmount !== "number" ||
      !Number.isFinite(targetAmount) ||
      targetAmount < 0
    ) {
      return NextResponse.json(
        { error: "targetAmount must be a non-negative number" },
        { status: 400 }
      );
    }

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

    const created = await budget.create({
      data: {
        userId: session.user.id,
        name: name ?? undefined,
        targetAmount: BigInt(Math.round(targetAmount)),
        categories: { connect: categoryIdsUnique.map((id) => ({ id })) },
      },
      include: { categories: { select: { id: true } } },
    });

    const actual = await getActualSpent(session.user.id, categoryIdsUnique);
    const response = {
      id: created.id,
      name: created.name,
      targetAmount: toNumber(created.targetAmount),
      categoryIds: created.categories.map((c) => c.id),
      actualAmount: toNumber(actual),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    return NextResponse.json({ budget: response }, { status: 201 });
  } catch (error) {
    console.error("Create budget error:", error);
    return NextResponse.json({ error: "Failed to create budget" }, { status: 500 });
  }
}
