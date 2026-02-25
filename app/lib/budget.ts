import { prisma } from "./prisma";

/**
 * Sum of expense amounts (in smallest unit, e.g. cents) for the given user and categories.
 * Optionally filter by date range (occurredAt).
 */
export async function getActualSpent(
  userId: string,
  categoryIds: string[],
  options?: { from?: Date; to?: Date }
): Promise<bigint> {
  if (categoryIds.length === 0) return BigInt(0);

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

  return result._sum.amount ?? BigInt(0);
}
