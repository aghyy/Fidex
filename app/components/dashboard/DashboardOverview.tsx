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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { renderIconByName } from "@/utils/icons";
import { useAtomValue } from "jotai";
import { profileAtom } from "@/state/profile";

type DashboardTransaction = {
  id: string;
  originAccountId: string;
  targetAccountId: string;
  amount: string | number;
  type: TransactionType;
  category: string;
  occurredAt: string;
};

type PeriodMode = "month" | "year";
const BALANCE_DISPLAY_DIVISOR = 10;

function parseAmount(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDisplayedBalance(value: number): string {
  return (value / BALANCE_DISPLAY_DIVISOR).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getPeriodOptionsFromTransactions(transactions: DashboardTransaction[]) {
  const yearSet = new Set<string>();
  const monthsByYear = new Map<string, Set<string>>();
  for (const tx of transactions) {
    const d = new Date(tx.occurredAt);
    if (Number.isNaN(d.getTime())) continue;
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, "0");
    yearSet.add(year);
    if (!monthsByYear.has(year)) monthsByYear.set(year, new Set<string>());
    monthsByYear.get(year)?.add(month);
  }

  const years = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  const normalizedMonthsByYear: Record<string, string[]> = {};
  for (const [year, months] of monthsByYear.entries()) {
    normalizedMonthsByYear[year] = Array.from(months).sort((a, b) => Number(b) - Number(a));
  }
  return { years, monthsByYear: normalizedMonthsByYear };
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
  const categoryListDefaultLimit = 5;
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
  const [allTransactions, setAllTransactions] = useState<DashboardTransaction[]>([]);
  const [transactionsAfterCutoff, setTransactionsAfterCutoff] = useState<DashboardTransaction[]>([]);
  const [pendingTransactionsUntilCutoff, setPendingTransactionsUntilCutoff] = useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSpendingCategories, setShowAllSpendingCategories] = useState(false);
  const [showAllEarningCategories, setShowAllEarningCategories] = useState(false);
  const profile = useAtomValue(profileAtom);
  const includePending = Boolean(profile?.bookAllTransactions);

  const periodOptions = useMemo(
    () => getPeriodOptionsFromTransactions(allTransactions),
    [allTransactions]
  );
  const selectedMonthPart = selectedMonth.split("-")[1] ?? "";
  const monthOptionsForSelectedYear = periodOptions.monthsByYear[selectedYear] ?? [];

  const range = useMemo(
    () => getRange(periodMode, selectedMonth, selectedYear),
    [periodMode, selectedMonth, selectedYear]
  );
  const balanceCutoff = useMemo(() => {
    const now = new Date();
    return range.end.getTime() > now.getTime() ? now : range.end;
  }, [range.end]);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const txParams = new URLSearchParams({
          from: range.start.toISOString(),
          to: balanceCutoff.toISOString(),
          includePending: String(includePending),
        });
        const afterCutoffParams = new URLSearchParams({
          from: new Date(balanceCutoff.getTime() + 1).toISOString(),
          includePending: "false",
        });
        const pendingUntilCutoffParams = new URLSearchParams({
          to: balanceCutoff.toISOString(),
          pendingOnly: "true",
        });

        const [accountsRes, categoriesRes, txRes, txAfterCutoffRes, allTxRes, pendingTxRes] = await Promise.all([
          fetch("/api/account", { credentials: "include" }),
          fetch("/api/category", { credentials: "include" }),
          fetch(`/api/transaction?${txParams.toString()}`, { credentials: "include" }),
          fetch(`/api/transaction?${afterCutoffParams.toString()}`, { credentials: "include" }),
          fetch(`/api/transaction?${new URLSearchParams({ includePending: String(includePending) }).toString()}`, { credentials: "include" }),
          includePending
            ? fetch(`/api/transaction?${pendingUntilCutoffParams.toString()}`, { credentials: "include" })
            : Promise.resolve(new Response(JSON.stringify({ transactions: [] }), { status: 200 })),
        ]);

        if (!accountsRes.ok || !categoriesRes.ok || !txRes.ok || !txAfterCutoffRes.ok || !allTxRes.ok || !pendingTxRes.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const accountsData = await accountsRes.json();
        const categoriesData = await categoriesRes.json();
        const txData = await txRes.json();
        const txAfterCutoffData = await txAfterCutoffRes.json();
        const allTxData = await allTxRes.json();
        const pendingTxData = await pendingTxRes.json();

        setAccounts(accountsData.accounts ?? []);
        setCategories(categoriesData.categories ?? []);
        setTransactions(txData.transactions ?? []);
        setTransactionsAfterCutoff(txAfterCutoffData.transactions ?? []);
        setAllTransactions(allTxData.transactions ?? []);
        setPendingTransactionsUntilCutoff(pendingTxData.transactions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, [range.start, balanceCutoff, includePending]);

  useEffect(() => {
    if (periodOptions.years.length > 0 && !periodOptions.years.includes(selectedYear)) {
      setSelectedYear(periodOptions.years[0]);
    }
  }, [periodOptions.years, selectedYear]);

  useEffect(() => {
    if (periodMode !== "month") return;
    const months = periodOptions.monthsByYear[selectedYear] ?? [];
    if (months.length === 0) return;
    if (!selectedMonth.startsWith(`${selectedYear}-`) || !months.includes(selectedMonthPart)) {
      setSelectedMonth(`${selectedYear}-${months[0]}`);
    }
  }, [periodMode, periodOptions.monthsByYear, selectedYear, selectedMonth, selectedMonthPart]);

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
        const d = new Date(tx.occurredAt);
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
        const d = new Date(tx.occurredAt);
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
    const spendMap = new Map<
      string,
      { categoryId: string; category: string; spent: number; transactions: number; color: string | null; icon: string | null }
    >();
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
        color: category?.color ?? null,
        icon: category?.icon ?? null,
      };
      current.spent += amount;
      current.transactions += 1;
      spendMap.set(tx.category, current);
    }
    return Array.from(spendMap.values()).sort((a, b) => b.spent - a.spent);
  }, [transactions, categoryById]);

  const categoryIncomeData = useMemo(() => {
    const incomeMap = new Map<
      string,
      { categoryId: string; category: string; earned: number; transactions: number; color: string | null; icon: string | null }
    >();
    for (const tx of transactions) {
      if (tx.type !== "INCOME") continue;
      const amount = parseAmount(tx.amount);
      const category = categoryById.get(tx.category);
      const label = category?.name ?? "Unknown category";
      const current = incomeMap.get(tx.category) ?? {
        categoryId: tx.category,
        category: label,
        earned: 0,
        transactions: 0,
        color: category?.color ?? null,
        icon: category?.icon ?? null,
      };
      current.earned += amount;
      current.transactions += 1;
      incomeMap.set(tx.category, current);
    }
    return Array.from(incomeMap.values()).sort((a, b) => b.earned - a.earned);
  }, [transactions, categoryById]);

  const visibleSpendCategories = useMemo(
    () =>
      showAllSpendingCategories
        ? categorySpendData
        : categorySpendData.slice(0, categoryListDefaultLimit),
    [showAllSpendingCategories, categorySpendData]
  );

  const visibleIncomeCategories = useMemo(
    () =>
      showAllEarningCategories
        ? categoryIncomeData
        : categoryIncomeData.slice(0, categoryListDefaultLimit),
    [showAllEarningCategories, categoryIncomeData]
  );

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

    const balanceAdjustments = new Map<string, number>();
    for (const tx of transactionsAfterCutoff) {
      const amount = parseAmount(tx.amount);
      if (tx.type === "EXPENSE") {
        balanceAdjustments.set(
          tx.originAccountId,
          (balanceAdjustments.get(tx.originAccountId) ?? 0) + amount
        );
      } else if (tx.type === "INCOME") {
        balanceAdjustments.set(
          tx.originAccountId,
          (balanceAdjustments.get(tx.originAccountId) ?? 0) - amount
        );
      } else {
        balanceAdjustments.set(
          tx.originAccountId,
          (balanceAdjustments.get(tx.originAccountId) ?? 0) + amount
        );
        balanceAdjustments.set(
          tx.targetAccountId,
          (balanceAdjustments.get(tx.targetAccountId) ?? 0) - amount
        );
      }
    }

    const pendingAdjustments = new Map<string, number>();
    if (includePending) {
      for (const tx of pendingTransactionsUntilCutoff) {
        const amount = parseAmount(tx.amount);
        if (tx.type === "EXPENSE") {
          pendingAdjustments.set(
            tx.originAccountId,
            (pendingAdjustments.get(tx.originAccountId) ?? 0) - amount
          );
        } else if (tx.type === "INCOME") {
          pendingAdjustments.set(
            tx.originAccountId,
            (pendingAdjustments.get(tx.originAccountId) ?? 0) + amount
          );
        } else {
          pendingAdjustments.set(
            tx.originAccountId,
            (pendingAdjustments.get(tx.originAccountId) ?? 0) - amount
          );
          pendingAdjustments.set(
            tx.targetAccountId,
            (pendingAdjustments.get(tx.targetAccountId) ?? 0) + amount
          );
        }
      }
    }

    return Array.from(stats.values())
      .map((row) => ({
        ...row,
        displayedBalance:
          row.account.balance +
          (balanceAdjustments.get(row.account.id) ?? 0) +
          (pendingAdjustments.get(row.account.id) ?? 0),
      }))
      .sort((a, b) => a.account.name.localeCompare(b.account.name));
  }, [accounts, transactions, transactionsAfterCutoff, includePending, pendingTransactionsUntilCutoff]);

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
              <Button
                type="button"
                variant={periodMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriodMode("month")}
              >
                Month
              </Button>
              <Button
                type="button"
                variant={periodMode === "year" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriodMode("year")}
              >
                Year
              </Button>
            </div>
            {periodMode === "month" ? (
              <div className="flex gap-2">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-10 w-[140px] bg-background" disabled={periodOptions.years.length === 0}>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedMonthPart}
                  onValueChange={(month) => setSelectedMonth(`${selectedYear}-${month}`)}
                >
                  <SelectTrigger className="h-10 w-[180px] bg-background" disabled={monthOptionsForSelectedYear.length === 0}>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptionsForSelectedYear.map((month) => (
                      <SelectItem key={month} value={month}>
                        {new Date(2000, Number(month) - 1, 1).toLocaleString(undefined, { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-10 w-[140px] bg-background" disabled={periodOptions.years.length === 0}>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        <h3 className="mb-3 text-base font-semibold">Accounts Overview</h3>
        <div className="space-y-2">
          {accountOverview.map((row) => (
            <Link
              key={row.account.id}
              href={`/accounts/${encodeURIComponent(row.account.id)}`}
              className="block rounded-lg border bg-background p-3 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg border"
                    style={{ backgroundColor: row.account.color ?? "#e5e7eb" }}
                  >
                    {renderIconByName(row.account.icon, row.account.color ?? "#e5e7eb", true)}
                  </div>
                  <div>
                    <p className="font-medium">{row.account.name}</p>
                    <p className="text-xs text-muted-foreground">{row.account.accountNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${row.displayedBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    EUR {formatDisplayedBalance(row.displayedBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">As of {balanceCutoff.toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <p className="text-muted-foreground">Income: EUR {row.income.toLocaleString()}</p>
                <p className="text-muted-foreground">Expense: EUR {row.expense.toLocaleString()}</p>
                <p className={row.net >= 0 ? "text-green-600" : "text-red-600"}>Net: EUR {row.net.toLocaleString()}</p>
                <p className="text-muted-foreground">Transactions: {row.txCount}</p>
              </div>
            </Link>
          ))}
          {accountOverview.length === 0 ? <p className="text-sm text-muted-foreground">No accounts available.</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <h3 className="mb-1 text-base font-semibold">Spending by Category</h3>
          <p className="mb-4 text-xs text-muted-foreground">Only expense transactions are included.</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySpendData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="category" interval={0} height={35} />
                <YAxis />
                <Tooltip
                  cursor={false}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "var(--radius)" }}
                />
                <Bar dataKey="spent" name="Spent (EUR)" fill="#dc2626" radius={[6, 6, 0, 0]} activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {visibleSpendCategories.map((row) => (
              <Link
                key={row.categoryId}
                href={`/categories/${encodeURIComponent(row.categoryId)}`}
                className="flex items-center justify-between rounded-lg border bg-background p-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg border"
                    style={{ backgroundColor: row.color ?? "#e5e7eb" }}
                  >
                    {renderIconByName(row.icon, row.color ?? "#e5e7eb", true)}
                  </div>
                  <div>
                    <p className="font-medium">{row.category}</p>
                    <p className="text-xs text-muted-foreground">{row.transactions} transactions</p>
                  </div>
                </div>
                <p className="font-semibold text-red-600">EUR {row.spent.toLocaleString()}</p>
              </Link>
            ))}
            {categorySpendData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense transactions in the selected timespan.</p>
            ) : null}
            {categorySpendData.length > categoryListDefaultLimit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAllSpendingCategories((prev) => !prev)}
              >
                {showAllSpendingCategories ? "Show less" : `Show more (${categorySpendData.length - categoryListDefaultLimit} more)`}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <h3 className="mb-1 text-base font-semibold">Earnings by Category</h3>
          <p className="mb-4 text-xs text-muted-foreground">Only income transactions are included.</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryIncomeData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="category" interval={0} height={35} />
                <YAxis />
                <Tooltip
                  cursor={false}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "var(--radius)" }}
                />
                <Bar dataKey="earned" name="Earned (EUR)" fill="#22c55e" radius={[6, 6, 0, 0]} activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {visibleIncomeCategories.map((row) => (
              <Link
                key={row.categoryId}
                href={`/categories/${encodeURIComponent(row.categoryId)}`}
                className="flex items-center justify-between rounded-lg border bg-background p-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg border"
                    style={{ backgroundColor: row.color ?? "#e5e7eb" }}
                  >
                    {renderIconByName(row.icon, row.color ?? "#e5e7eb", true)}
                  </div>
                  <div>
                    <p className="font-medium">{row.category}</p>
                    <p className="text-xs text-muted-foreground">{row.transactions} transactions</p>
                  </div>
                </div>
                <p className="font-semibold text-green-600">EUR {row.earned.toLocaleString()}</p>
              </Link>
            ))}
            {categoryIncomeData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No income transactions in the selected timespan.</p>
            ) : null}
            {categoryIncomeData.length > categoryListDefaultLimit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAllEarningCategories((prev) => !prev)}
              >
                {showAllEarningCategories ? "Show less" : `Show more (${categoryIncomeData.length - categoryListDefaultLimit} more)`}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
