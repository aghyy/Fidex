import { prisma } from "./prisma";
import { toMoneyNumber } from "./money";

/**
 * Sum of expense amounts for the given user and categories.
 * Returns the sum in EUR (transaction.amount is stored in EUR in this app).
 * Optionally filter by date range (occurredAt).
 */
export async function getActualSpent(
  userId: string,
  categoryIds: string[],
  options?: { from?: Date; to?: Date }
): Promise<number> {
  if (categoryIds.length === 0) return 0;

  const where: {
    userId: string;
    type: "EXPENSE";
    category: { in: string[] };
    occurredAt?: { gte?: Date; lte?: Date };
  } = {
    userId,
    type: "EXPENSE",
    category: { in: categoryIds },
  };

  if (options?.from || options?.to) {
    where.occurredAt = {};
    if (options.from) where.occurredAt.gte = options.from;
    if (options.to) where.occurredAt.lte = options.to;
  }

  const result = await prisma.transaction.aggregate({
    where,
    _sum: { amount: true },
  });

  return toMoneyNumber(result._sum.amount ?? 0);
}
