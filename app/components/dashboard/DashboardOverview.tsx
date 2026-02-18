"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Account } from "@/types/accounts";
import { Category } from "@/types/categories";
import { TransactionType } from "@/types/transactions";

type DashboardTransaction = {
  id: string;
  originAccountId: string;
  targetAccountId: string;
  amount: string | number;
  type: TransactionType;
  category: string;
  createdAt: string;
};

type PeriodMode = "month" | "year";

function parseAmount(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRange(mode: PeriodMode, monthValue: string, yearValue: string) {
  const now = new Date();
  if (mode === "month") {
    const [yy, mm] = (monthValue || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
      .split("-")
      .map(Number);
    const start = new Date(yy, mm - 1, 1, 0, 0, 0, 0);
    const end = new Date(yy, mm, 0, 23, 59, 59, 999);
    return {
      start,
      end,
      label: start.toLocaleString(undefined, { month: "long", year: "numeric" }),
    };
  }

  const year = Number(yearValue || now.getFullYear());
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return {
    start,
    end,
    label: String(year),
  };
}

export default function DashboardOverview() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const years = Array.from({ length: 8 }, (_, idx) => String(currentYear - idx));

  const range = useMemo(
    () => getRange(periodMode, selectedMonth, selectedYear),
    [periodMode, selectedMonth, selectedYear]
  );

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const txParams = new URLSearchParams({
          from: range.start.toISOString(),
          to: range.end.toISOString(),
        });

        const [accountsRes, categoriesRes, txRes] = await Promise.all([
          fetch("/api/account", { credentials: "include" }),
          fetch("/api/category", { credentials: "include" }),
          fetch(`/api/transaction?${txParams.toString()}`, { credentials: "include" }),
        ]);

        if (!accountsRes.ok || !categoriesRes.ok || !txRes.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const accountsData = await accountsRes.json();
        const categoriesData = await categoriesRes.json();
        const txData = await txRes.json();

        setAccounts(accountsData.accounts ?? []);
        setCategories(categoriesData.categories ?? []);
        setTransactions(txData.transactions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, [range.start, range.end]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfer = 0;
    for (const tx of transactions) {
      const amount = parseAmount(tx.amount);
      if (tx.type === "INCOME") income += amount;
      else if (tx.type === "EXPENSE") expense += amount;
      else transfer += amount;
    }
    return {
      income,
      expense,
      transfer,
      net: income - expense,
    };
  }, [transactions]);

  const cashflowChartData = useMemo(() => {
    const bucket = new Map<string, { label: string; income: number; expense: number; net: number }>();
    if (periodMode === "month") {
      const daysInMonth = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = String(day);
        bucket.set(key, { label: key, income: 0, expense: 0, net: 0 });
      }
      for (const tx of transactions) {
        const d = new Date(tx.createdAt);
        const key = String(d.getDate());
        const row = bucket.get(key);
        if (!row) continue;
        const amount = parseAmount(tx.amount);
        if (tx.type === "INCOME") {
          row.income += amount;
          row.net += amount;
        } else if (tx.type === "EXPENSE") {
          row.expense += amount;
          row.net -= amount;
        }
      }
    } else {
      for (let month = 0; month < 12; month += 1) {
        const label = new Date(range.start.getFullYear(), month, 1).toLocaleString(undefined, {
          month: "short",
        });
        bucket.set(String(month), { label, income: 0, expense: 0, net: 0 });
      }
      for (const tx of transactions) {
        const d = new Date(tx.createdAt);
        const key = String(d.getMonth());
        const row = bucket.get(key);
        if (!row) continue;
        const amount = parseAmount(tx.amount);
        if (tx.type === "INCOME") {
          row.income += amount;
          row.net += amount;
        } else if (tx.type === "EXPENSE") {
          row.expense += amount;
          row.net -= amount;
        }
      }
    }

    return Array.from(bucket.values());
  }, [transactions, periodMode, range.start]);

  const categorySpendData = useMemo(() => {
    const spendMap = new Map<string, { categoryId: string; category: string; spent: number; transactions: number }>();
    for (const tx of transactions) {
      if (tx.type !== "EXPENSE") continue;
      const amount = parseAmount(tx.amount);
      const category = categoryById.get(tx.category);
      const label = category?.name ?? "Unknown category";
      const current = spendMap.get(tx.category) ?? {
        categoryId: tx.category,
        category: label,
        spent: 0,
        transactions: 0,
      };
      current.spent += amount;
      current.transactions += 1;
      spendMap.set(tx.category, current);
    }
    return Array.from(spendMap.values()).sort((a, b) => b.spent - a.spent);
  }, [transactions, categoryById]);

  const accountOverview = useMemo(() => {
    const stats = new Map<
      string,
      {
        account: Account;
        income: number;
        expense: number;
        net: number;
        txCount: number;
      }
    >();

    for (const account of accounts) {
      stats.set(account.id, { account, income: 0, expense: 0, net: 0, txCount: 0 });
    }

    for (const tx of transactions) {
      const amount = parseAmount(tx.amount);
      if (tx.type === "EXPENSE") {
        const origin = stats.get(tx.originAccountId);
        if (origin) {
          origin.expense += amount;
          origin.net -= amount;
          origin.txCount += 1;
        }
      } else if (tx.type === "INCOME") {
        const origin = stats.get(tx.originAccountId);
        if (origin) {
          origin.income += amount;
          origin.net += amount;
          origin.txCount += 1;
        }
      } else {
        const origin = stats.get(tx.originAccountId);
        if (origin) {
          origin.expense += amount;
          origin.net -= amount;
          origin.txCount += 1;
        }
        const target = stats.get(tx.targetAccountId);
        if (target) {
          target.income += amount;
          target.net += amount;
          target.txCount += 1;
        }
      }
    }

    return Array.from(stats.values()).sort((a, b) => a.account.name.localeCompare(b.account.name));
  }, [accounts, transactions]);

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Financial Overview</h2>
            <p className="text-sm text-muted-foreground">
              Filtered for <span className="font-medium">{range.label}</span>. Currently only EUR is available.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-lg border bg-background p-1">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm ${periodMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => setPeriodMode("month")}
              >
                Month
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm ${periodMode === "year" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => setPeriodMode("year")}
              >
                Year
              </button>
            </div>
            {periodMode === "month" ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              />
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-semibold text-green-600">EUR {totals.income.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Expense</p>
            <p className="text-lg font-semibold text-red-600">EUR {totals.expense.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={`text-lg font-semibold ${totals.net >= 0 ? "text-green-600" : "text-red-600"}`}>
              EUR {totals.net.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Transfers</p>
            <p className="text-lg font-semibold">EUR {totals.transfer.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <h3 className="mb-1 text-base font-semibold">Cashflow Trend</h3>
          <p className="mb-4 text-xs text-muted-foreground">Income vs expense and net flow in selected timespan.</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflowChartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "var(--radius)" }} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Income" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#dc2626" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="net" name="Net" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <h3 className="mb-1 text-base font-semibold">Spending by Category</h3>
          <p className="mb-4 text-xs text-muted-foreground">Only expense transactions are included.</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySpendData.slice(0, 8)}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="category" interval={0} height={35} />
                <YAxis />
                <Tooltip
                  cursor={false}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "var(--radius)" }}
                />
                <Bar dataKey="spent" name="Spent (EUR)" fill="#f97316" radius={[6, 6, 0, 0]} activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <h3 className="mb-3 text-base font-semibold">Accounts Overview (Filtered)</h3>
          <div className="space-y-2">
            {accountOverview.map((row) => (
              <div key={row.account.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.account.name}</p>
                    <p className="text-xs text-muted-foreground">{row.account.accountNumber}</p>
                  </div>
                  <p className="text-sm font-semibold">Balance: EUR {row.account.balance.toLocaleString()}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <p className="text-muted-foreground">Income: EUR {row.income.toLocaleString()}</p>
                  <p className="text-muted-foreground">Expense: EUR {row.expense.toLocaleString()}</p>
                  <p className={row.net >= 0 ? "text-green-600" : "text-red-600"}>Net: EUR {row.net.toLocaleString()}</p>
                  <p className="text-muted-foreground">Transactions: {row.txCount}</p>
                </div>
              </div>
            ))}
            {accountOverview.length === 0 ? <p className="text-sm text-muted-foreground">No accounts available.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <h3 className="mb-3 text-base font-semibold">Category Spending (Filtered)</h3>
          <div className="space-y-2">
            {categorySpendData.map((row) => (
              <div key={row.categoryId} className="flex items-center justify-between rounded-lg border bg-background p-3">
                <div>
                  <p className="font-medium">{row.category}</p>
                  <p className="text-xs text-muted-foreground">{row.transactions} transactions</p>
                </div>
                <p className="font-semibold text-red-600">EUR {row.spent.toLocaleString()}</p>
              </div>
            ))}
            {categorySpendData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense transactions in the selected timespan.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <h3 className="mb-3 text-base font-semibold">Quick Links</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {accounts.slice(0, 4).map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${encodeURIComponent(account.id)}`}
              className="rounded-lg border bg-background px-3 py-2 text-sm hover:bg-accent/50"
            >
              {account.name}
            </Link>
          ))}
          {accounts.length === 0 ? <p className="text-sm text-muted-foreground">No accounts yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
