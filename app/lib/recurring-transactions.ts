import { prisma } from "./prisma";
import { roundMoney, toMoneyNumber } from "./money";
import type { TransactionInterval, TransactionType } from "@/types/transactions";

/**
 * Maximum number of occurrences a single template will materialize in a single
 * run. Prevents runaway loops in case of data corruption or extremely short
 * intervals mixed with very old start dates. Daily for 5 years is ~1825 runs
 * which is well within this safety margin.
 */
const MAX_OCCURRENCES_PER_RUN = 4000;

export function computeNextOccurrence(
  current: Date,
  interval: TransactionInterval
): Date {
  const next = new Date(current.getTime());
  switch (interval) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      return next;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      return next;
    case "MONTHLY":
      addMonthsPreservingDay(next, 1);
      return next;
    case "QUARTERLY":
      addMonthsPreservingDay(next, 3);
      return next;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    case "ONCE":
    default:
      return next;
  }
}

/**
 * Adds N calendar months to the given date in place while preserving the
 * original day-of-month where possible. Dates like Jan 31 + 1 month roll back
 * to the last day of February instead of spilling into March.
 */
function addMonthsPreservingDay(date: Date, months: number): void {
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const daysInTargetMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
  date.setDate(Math.min(originalDay, daysInTargetMonth));
}

type RecurringTemplate = {
  id: string;
  userId: string;
  originAccountId: string;
  targetAccountId: string;
  amount: number | string;
  notes: string;
  interval: TransactionInterval;
  type: TransactionType;
  category: string;
  startDate: Date;
  endDate: Date | null;
  nextOccurrenceAt: Date;
  lastOccurrenceAt: Date | null;
  active: boolean;
};

type PrismaTx = {
  account: {
    findFirst: (args: {
      where: { id: string; userId: string };
    }) => Promise<{ id: string; balance: number | string; currency: string } | null>;
    update: (args: {
      where: { id: string };
      data: { balance: number };
    }) => Promise<unknown>;
  };
  transaction: {
    create: (args: {
      data: {
        userId: string;
        originAccountId: string;
        targetAccountId: string;
        amount: number;
        notes: string;
        interval: TransactionInterval;
        type: TransactionType;
        category: string;
        occurredAt: Date;
        pending: boolean;
        expires: Date;
        recurringTransactionId: string;
      };
    }) => Promise<{ id: string }>;
  };
  recurringTransaction: {
    findMany: (args: {
      where: {
        active?: boolean;
        userId?: string;
        nextOccurrenceAt?: { lte?: Date };
      };
      orderBy?: { nextOccurrenceAt: "asc" | "desc" };
    }) => Promise<RecurringTemplate[]>;
    update: (args: {
      where: { id: string };
      data: Partial<{
        nextOccurrenceAt: Date;
        lastOccurrenceAt: Date;
        active: boolean;
      }>;
    }) => Promise<unknown>;
  };
};

export type MaterializationStats = {
  templatesProcessed: number;
  occurrencesCreated: number;
  templatesDeactivated: number;
  errors: Array<{ recurringId: string; message: string }>;
};

/**
 * Materializes all due occurrences for recurring transaction templates.
 *
 * For each active template with nextOccurrenceAt <= now, a new Transaction row
 * is created and account balances are updated. The template's
 * nextOccurrenceAt is advanced to the next scheduled slot (looping while still
 * due). Templates whose next occurrence rolls past their endDate are marked
 * inactive.
 *
 * Each template is processed in its own database transaction so a single
 * failure doesn't poison the rest of the batch.
 */
export async function materializeDueRecurringTransactions(options?: {
  userId?: string;
  now?: Date;
}): Promise<MaterializationStats> {
  const now = options?.now ?? new Date();
  const stats: MaterializationStats = {
    templatesProcessed: 0,
    occurrencesCreated: 0,
    templatesDeactivated: 0,
    errors: [],
  };

  const db = prisma as unknown as {
    recurringTransaction: {
      findMany: (args: {
        where: {
          active: boolean;
          userId?: string;
          nextOccurrenceAt: { lte: Date };
        };
        orderBy: { nextOccurrenceAt: "asc" };
      }) => Promise<RecurringTemplate[]>;
    };
    $transaction: <T>(fn: (tx: PrismaTx) => Promise<T>) => Promise<T>;
  };

  const dueTemplates = await db.recurringTransaction.findMany({
    where: {
      active: true,
      ...(options?.userId ? { userId: options.userId } : {}),
      nextOccurrenceAt: { lte: now },
    },
    orderBy: { nextOccurrenceAt: "asc" },
  });

  for (const template of dueTemplates) {
    try {
      const result = await db.$transaction(async (tx) => {
        return materializeSingleTemplate(tx, template, now);
      });
      stats.templatesProcessed += 1;
      stats.occurrencesCreated += result.created;
      if (result.deactivated) stats.templatesDeactivated += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      stats.errors.push({ recurringId: template.id, message });
      console.error(
        `Failed to materialize recurring transaction ${template.id}:`,
        error
      );
    }
  }

  return stats;
}

/**
 * Materializes due occurrences for a single template inside an existing
 * Prisma transaction context. Intended for use by POST /api/transaction so
 * the first occurrence is created synchronously along with the template.
 */
export async function materializeSingleTemplate(
  tx: PrismaTx,
  template: RecurringTemplate,
  now: Date
): Promise<{ created: number; deactivated: boolean }> {
  if (!template.active) return { created: 0, deactivated: false };
  if (template.interval === "ONCE") {
    return { created: 0, deactivated: false };
  }

  const origin = await tx.account.findFirst({
    where: { id: template.originAccountId, userId: template.userId },
  });
  if (!origin) throw new Error("Origin account not found");

  const isTransfer = template.type === "TRANSFER";
  const target = isTransfer
    ? await tx.account.findFirst({
        where: { id: template.targetAccountId, userId: template.userId },
      })
    : origin;
  if (!target) throw new Error("Target account not found");

  let originBalance = toMoneyNumber(origin.balance);
  let targetBalance = toMoneyNumber(target.balance);
  const amount = toMoneyNumber(template.amount);

  let nextOccurrenceAt = template.nextOccurrenceAt;
  let lastOccurrenceAt = template.lastOccurrenceAt;
  let created = 0;
  let deactivated = false;

  const endDateMs = template.endDate ? template.endDate.getTime() : null;

  for (let guard = 0; guard < MAX_OCCURRENCES_PER_RUN; guard += 1) {
    const dueTime = nextOccurrenceAt.getTime();
    if (dueTime > now.getTime()) break;
    if (endDateMs !== null && dueTime > endDateMs) {
      deactivated = true;
      break;
    }

    // Far-future expires on the resulting Transaction row so it is still
    // included in any existing "expires > now" filters if present elsewhere.
    const expires = new Date(dueTime + 100 * 365 * 24 * 60 * 60 * 1000);

    await tx.transaction.create({
      data: {
        userId: template.userId,
        originAccountId: template.originAccountId,
        targetAccountId: isTransfer
          ? template.targetAccountId
          : template.originAccountId,
        amount,
        notes: template.notes ?? "",
        interval: "ONCE",
        type: template.type,
        category: template.category,
        occurredAt: new Date(dueTime),
        pending: false,
        expires,
        recurringTransactionId: template.id,
      },
    });

    if (template.type === "EXPENSE") {
      originBalance = roundMoney(originBalance - amount);
      await tx.account.update({
        where: { id: template.originAccountId },
        data: { balance: originBalance },
      });
    } else if (template.type === "INCOME") {
      originBalance = roundMoney(originBalance + amount);
      await tx.account.update({
        where: { id: template.originAccountId },
        data: { balance: originBalance },
      });
    } else {
      originBalance = roundMoney(originBalance - amount);
      targetBalance = roundMoney(targetBalance + amount);
      await tx.account.update({
        where: { id: template.originAccountId },
        data: { balance: originBalance },
      });
      await tx.account.update({
        where: { id: template.targetAccountId },
        data: { balance: targetBalance },
      });
    }

    lastOccurrenceAt = new Date(dueTime);
    created += 1;
    nextOccurrenceAt = computeNextOccurrence(
      nextOccurrenceAt,
      template.interval
    );

    if (endDateMs !== null && nextOccurrenceAt.getTime() > endDateMs) {
      deactivated = true;
      break;
    }
  }

  await tx.recurringTransaction.update({
    where: { id: template.id },
    data: {
      nextOccurrenceAt,
      ...(lastOccurrenceAt ? { lastOccurrenceAt } : {}),
      ...(deactivated ? { active: false } : {}),
    },
  });

  return { created, deactivated };
}
