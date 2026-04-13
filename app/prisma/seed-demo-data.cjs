/* Demo data seeder for local testing.
 * NOT used in production. Run manually with:
 *
 *   cd app
 *   npm run db:seed
 */
/* eslint-disable @typescript-eslint/no-require-imports */

require("dotenv").config();

const { PrismaClient, TransactionType, Currency } = require("@prisma/client");

const prisma = new PrismaClient();

const DEMO_USER_EMAIL = process.env.SEED_USER_EMAIL;
if (!DEMO_USER_EMAIL || !String(DEMO_USER_EMAIL).trim()) {
  throw new Error("Missing SEED_USER_EMAIL in environment. Set it in .env (or your shell) before running db:seed.");
}
const MONTH_COUNT = 6;

const ACCOUNT_DEFS = [
  { key: "checking", name: "Checking", accountNumber: "DE00 0000 0000 0000 0000 01", color: "#0ea5e9", icon: "IconCreditCard" },
  { key: "savings", name: "Savings", accountNumber: "DE00 0000 0000 0000 0000 02", color: "#22c55e", icon: "IconPigMoney" },
  { key: "cash", name: "Cash", accountNumber: "CASH", color: "#f97316", icon: "IconCashBanknote" },
];

const CATEGORY_DEFS = [
  { key: "salary", name: "Salary", color: "#16a34a", icon: "IconCoins" },
  { key: "freelance", name: "Freelance", color: "#22c55e", icon: "IconWallet" },
  { key: "rent", name: "Rent", color: "#ef4444", icon: "IconHome" },
  { key: "utilities", name: "Utilities", color: "#f59e0b", icon: "IconBolt" },
  { key: "groceries", name: "Groceries", color: "#84cc16", icon: "IconShoppingCart" },
  { key: "transport", name: "Transport", color: "#06b6d4", icon: "IconTrain" },
  { key: "dining", name: "Dining Out", color: "#fb7185", icon: "IconToolsKitchen2" },
  { key: "shopping", name: "Shopping", color: "#a855f7", icon: "IconShoppingBag" },
  { key: "entertainment", name: "Entertainment", color: "#6366f1", icon: "IconMovie" },
  { key: "health", name: "Healthcare", color: "#14b8a6", icon: "IconMedicalCross" },
  { key: "insurance", name: "Insurance", color: "#64748b", icon: "IconReceipt" },
  { key: "subscriptions", name: "Subscriptions", color: "#0ea5e9", icon: "IconDeviceGamepad2" },
  { key: "savingsContribution", name: "Savings Contribution", color: "#22c55e", icon: "IconTransferIn" },
  { key: "cashWithdrawal", name: "Cash Withdrawal", color: "#f97316", icon: "IconCashBanknote" },
];

const BUDGET_DEFS = [
  { name: "Groceries", targetAmount: 500, categories: ["groceries"] },
  { name: "Transport", targetAmount: 180, categories: ["transport"] },
  { name: "Dining & Entertainment", targetAmount: 320, categories: ["dining", "entertainment"] },
  { name: "Shopping", targetAmount: 220, categories: ["shopping"] },
];

function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function randomMoney(rng, min, max) {
  const cents = randomInt(rng, Math.round(min * 100), Math.round(max * 100));
  return roundMoney(cents / 100);
}

function randomChance(rng, probability) {
  return rng() < probability;
}

function randomDateInMonth(rng, year, month, dayMin, dayMax, hourMin = 8, hourMax = 21) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeMin = Math.max(1, dayMin);
  const safeMax = Math.min(daysInMonth, dayMax);
  const day = randomInt(rng, safeMin, Math.max(safeMin, safeMax));
  const hour = randomInt(rng, hourMin, hourMax);
  const minute = randomInt(rng, 0, 59);
  return new Date(year, month, day, hour, minute, 0, 0);
}

function getRecentMonths(count) {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

function pickCashExpenseCategory(rng) {
  const pool = ["groceries", "dining", "entertainment"];
  return pool[randomInt(rng, 0, pool.length - 1)];
}

async function resetUserFinanceData(userId) {
  const txIds = await prisma.transaction.findMany({
    where: { userId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    if (txIds.length > 0) {
      await tx.documentTransaction.deleteMany({
        where: { transactionId: { in: txIds.map((t) => t.id) } },
      });
    }

    await tx.transaction.deleteMany({ where: { userId } });
    await tx.budget.deleteMany({ where: { userId } });
    await tx.category.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
  });
}

async function main() {
  console.log("Seeding realistic demo data...");

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: {
      email: DEMO_USER_EMAIL,
      firstName: "Demo",
      lastName: "User",
      bookAllTransactions: false,
    },
  });

  await resetUserFinanceData(user.id);

  const accountsByKey = {};
  for (const accountDef of ACCOUNT_DEFS) {
    const created = await prisma.account.create({
      data: {
        userId: user.id,
        name: accountDef.name,
        accountNumber: accountDef.accountNumber,
        color: accountDef.color,
        icon: accountDef.icon,
        balance: 0,
        currency: Currency.EUR,
      },
    });
    accountsByKey[accountDef.key] = created;
  }

  const categoriesByKey = {};
  for (const categoryDef of CATEGORY_DEFS) {
    const created = await prisma.category.create({
      data: {
        userId: user.id,
        name: categoryDef.name,
        color: categoryDef.color,
        icon: categoryDef.icon,
      },
    });
    categoriesByKey[categoryDef.key] = created;
  }

  for (const budgetDef of BUDGET_DEFS) {
    await prisma.budget.create({
      data: {
        userId: user.id,
        name: budgetDef.name,
        targetAmount: budgetDef.targetAmount,
        categories: {
          connect: budgetDef.categories.map((key) => ({ id: categoriesByKey[key].id })),
        },
      },
    });
  }

  const months = getRecentMonths(MONTH_COUNT);
  const rng = createRng(20260225);
  const balances = {
    [accountsByKey.checking.id]: 0,
    [accountsByKey.savings.id]: 0,
    [accountsByKey.cash.id]: 0,
  };
  const transactions = [];

  function addTransaction({
    amount,
    type,
    categoryKey,
    notes,
    occurredAt,
    originKey,
    targetKey,
    pending = false,
  }) {
    const originId = accountsByKey[originKey].id;
    const targetId = accountsByKey[targetKey].id;
    const normalizedAmount = roundMoney(amount);

    transactions.push({
      userId: user.id,
      originAccountId: originId,
      targetAccountId: targetId,
      amount: normalizedAmount,
      notes,
      interval: "ONCE",
      type,
      category: categoriesByKey[categoryKey].id,
      occurredAt,
      pending,
      expires: occurredAt,
    });

    if (pending) return;

    if (type === TransactionType.INCOME) {
      balances[originId] = roundMoney(balances[originId] + normalizedAmount);
      return;
    }
    if (type === TransactionType.EXPENSE) {
      balances[originId] = roundMoney(balances[originId] - normalizedAmount);
      return;
    }

    balances[originId] = roundMoney(balances[originId] - normalizedAmount);
    balances[targetId] = roundMoney(balances[targetId] + normalizedAmount);
  }

  for (const { year, month } of months) {
    addTransaction({
      amount: randomMoney(rng, 3200, 4100),
      type: TransactionType.INCOME,
      categoryKey: "salary",
      notes: "Monthly salary",
      occurredAt: randomDateInMonth(rng, year, month, 26, 28, 7, 11),
      originKey: "checking",
      targetKey: "checking",
    });

    if (randomChance(rng, 0.35)) {
      addTransaction({
        amount: randomMoney(rng, 450, 1300),
        type: TransactionType.INCOME,
        categoryKey: "freelance",
        notes: "Freelance project payout",
        occurredAt: randomDateInMonth(rng, year, month, 8, 20, 9, 18),
        originKey: "checking",
        targetKey: "checking",
      });
    }

    addTransaction({
      amount: randomMoney(rng, 980, 1280),
      type: TransactionType.EXPENSE,
      categoryKey: "rent",
      notes: "Apartment rent",
      occurredAt: randomDateInMonth(rng, year, month, 1, 3, 9, 12),
      originKey: "checking",
      targetKey: "checking",
    });

    addTransaction({
      amount: randomMoney(rng, 140, 260),
      type: TransactionType.EXPENSE,
      categoryKey: "utilities",
      notes: "Electricity and water",
      occurredAt: randomDateInMonth(rng, year, month, 4, 9, 9, 12),
      originKey: "checking",
      targetKey: "checking",
    });

    addTransaction({
      amount: randomMoney(rng, 35, 55),
      type: TransactionType.EXPENSE,
      categoryKey: "subscriptions",
      notes: "Home internet",
      occurredAt: randomDateInMonth(rng, year, month, 10, 14, 9, 12),
      originKey: "checking",
      targetKey: "checking",
    });

    addTransaction({
      amount: randomMoney(rng, 12, 25),
      type: TransactionType.EXPENSE,
      categoryKey: "subscriptions",
      notes: "Mobile plan",
      occurredAt: randomDateInMonth(rng, year, month, 12, 20, 9, 12),
      originKey: "checking",
      targetKey: "checking",
    });

    addTransaction({
      amount: randomMoney(rng, 80, 140),
      type: TransactionType.EXPENSE,
      categoryKey: "insurance",
      notes: "Health and liability insurance",
      occurredAt: randomDateInMonth(rng, year, month, 3, 8, 9, 12),
      originKey: "checking",
      targetKey: "checking",
    });

    addTransaction({
      amount: randomMoney(rng, 25, 55),
      type: TransactionType.EXPENSE,
      categoryKey: "subscriptions",
      notes: "Gym membership",
      occurredAt: randomDateInMonth(rng, year, month, 2, 6, 9, 12),
      originKey: "checking",
      targetKey: "checking",
    });

    addTransaction({
      amount: randomMoney(rng, 49, 89),
      type: TransactionType.EXPENSE,
      categoryKey: "transport",
      notes: "Public transport ticket",
      occurredAt: randomDateInMonth(rng, year, month, 1, 4, 9, 12),
      originKey: "checking",
      targetKey: "checking",
    });

    const groceryTrips = randomInt(rng, 4, 6);
    for (let i = 0; i < groceryTrips; i += 1) {
      addTransaction({
        amount: randomMoney(rng, 45, 120),
        type: TransactionType.EXPENSE,
        categoryKey: "groceries",
        notes: "Supermarket shopping",
        occurredAt: randomDateInMonth(rng, year, month, 1, 28, 10, 20),
        originKey: "checking",
        targetKey: "checking",
      });
    }

    const diningTrips = randomInt(rng, 4, 8);
    for (let i = 0; i < diningTrips; i += 1) {
      addTransaction({
        amount: randomMoney(rng, 18, 65),
        type: TransactionType.EXPENSE,
        categoryKey: "dining",
        notes: "Restaurant or takeaway",
        occurredAt: randomDateInMonth(rng, year, month, 1, 28, 12, 22),
        originKey: "checking",
        targetKey: "checking",
      });
    }

    const shoppingTrips = randomInt(rng, 1, 3);
    for (let i = 0; i < shoppingTrips; i += 1) {
      addTransaction({
        amount: randomMoney(rng, 35, 220),
        type: TransactionType.EXPENSE,
        categoryKey: "shopping",
        notes: "Clothes or household goods",
        occurredAt: randomDateInMonth(rng, year, month, 1, 28, 11, 20),
        originKey: "checking",
        targetKey: "checking",
      });
    }

    const leisureTrips = randomInt(rng, 2, 4);
    for (let i = 0; i < leisureTrips; i += 1) {
      addTransaction({
        amount: randomMoney(rng, 12, 55),
        type: TransactionType.EXPENSE,
        categoryKey: "entertainment",
        notes: "Cinema, apps, or events",
        occurredAt: randomDateInMonth(rng, year, month, 1, 28, 13, 22),
        originKey: "checking",
        targetKey: "checking",
      });
    }

    if (randomChance(rng, 0.4)) {
      const healthEntries = randomInt(rng, 1, 2);
      for (let i = 0; i < healthEntries; i += 1) {
        addTransaction({
          amount: randomMoney(rng, 15, 90),
          type: TransactionType.EXPENSE,
          categoryKey: "health",
          notes: "Pharmacy or doctor co-pay",
          occurredAt: randomDateInMonth(rng, year, month, 1, 28, 10, 18),
          originKey: "checking",
          targetKey: "checking",
        });
      }
    }

    const savingsTransfer = randomMoney(rng, 250, 700);
    addTransaction({
      amount: savingsTransfer,
      type: TransactionType.TRANSFER,
      categoryKey: "savingsContribution",
      notes: "Monthly transfer to savings",
      occurredAt: randomDateInMonth(rng, year, month, 27, 29, 10, 16),
      originKey: "checking",
      targetKey: "savings",
    });

    const cashWithdrawal = randomMoney(rng, 90, 180);
    addTransaction({
      amount: cashWithdrawal,
      type: TransactionType.TRANSFER,
      categoryKey: "cashWithdrawal",
      notes: "Cash withdrawal from ATM",
      occurredAt: randomDateInMonth(rng, year, month, 2, 20, 10, 19),
      originKey: "checking",
      targetKey: "cash",
    });

    const cashSpendCount = randomInt(rng, 2, 4);
    let remainingCashBudget = roundMoney(cashWithdrawal * 0.85);
    for (let i = 0; i < cashSpendCount; i += 1) {
      const remainingSlots = cashSpendCount - i - 1;
      const reserveForRemaining = roundMoney(remainingSlots * 8);
      const maxForEntry = Math.max(10, roundMoney(remainingCashBudget - reserveForRemaining));
      const amount = i === cashSpendCount - 1 ? Math.max(8, remainingCashBudget) : randomMoney(rng, 8, maxForEntry);
      remainingCashBudget = roundMoney(remainingCashBudget - amount);
      addTransaction({
        amount,
        type: TransactionType.EXPENSE,
        categoryKey: pickCashExpenseCategory(rng),
        notes: "Cash purchase",
        occurredAt: randomDateInMonth(rng, year, month, 1, 28, 9, 21),
        originKey: "cash",
        targetKey: "cash",
      });
    }
  }

  const currentMonth = months[months.length - 1];
  addTransaction({
    amount: randomMoney(rng, 18, 42),
    type: TransactionType.EXPENSE,
    categoryKey: "subscriptions",
    notes: "Streaming renewal (pending)",
    occurredAt: randomDateInMonth(rng, currentMonth.year, currentMonth.month, 24, 28, 9, 18),
    originKey: "checking",
    targetKey: "checking",
    pending: true,
  });
  addTransaction({
    amount: randomMoney(rng, 45, 95),
    type: TransactionType.EXPENSE,
    categoryKey: "groceries",
    notes: "Card payment pending",
    occurredAt: randomDateInMonth(rng, currentMonth.year, currentMonth.month, 25, 28, 10, 21),
    originKey: "checking",
    targetKey: "checking",
    pending: true,
  });

  transactions.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  await prisma.transaction.createMany({ data: transactions });

  await Promise.all(
    Object.entries(accountsByKey).map(([key, account]) =>
      prisma.account.update({
        where: { id: account.id },
        data: {
          balance: roundMoney(balances[account.id]),
          color: ACCOUNT_DEFS.find((def) => def.key === key).color,
          icon: ACCOUNT_DEFS.find((def) => def.key === key).icon,
        },
      })
    )
  );

  const totalIncome = transactions
    .filter((tx) => tx.type === TransactionType.INCOME && tx.pending === false)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === TransactionType.EXPENSE && tx.pending === false)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  console.log(`Seeded user: ${DEMO_USER_EMAIL}`);
  console.log(`Categories: ${CATEGORY_DEFS.length}, Budgets: ${BUDGET_DEFS.length}`);
  console.log(`Transactions: ${transactions.length} (${MONTH_COUNT} months)`);
  console.log(`Income: ${totalIncome} EUR | Expenses: ${totalExpense} EUR`);
  console.log("Realistic demo seeding complete.");
}

main()
  .catch((error) => {
    console.error("Seeder failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

