"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Account } from "@/types/accounts";
import { Category } from "@/types/categories";
import { TransactionType } from "@/types/transactions";
import { Button } from "@/components/ui/button";
import { renderIconByName } from "@/utils/icons";
import { useAtomValue } from "jotai";
import { profileAtom } from "@/state/profile";
import PeriodFilterPopover from "@/components/filters/PeriodFilterPopover";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

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

const cashflowChartConfig = {
  income: {
    label: "Income",
  },
  expense: {
    label: "Expense",
  },
  net: {
    label: "Net",
  },
} satisfies ChartConfig;

const spendingChartConfig = {
  spent: {
    label: "Spent (EUR)",
    color: "#dc2626",
  },
} satisfies ChartConfig;

const earningChartConfig = {
  earned: {
    label: "Earned (EUR)",
    color: "#22c55e",
  },
} satisfies ChartConfig;

function parseAmount(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDisplayedBalance(value: number): string {
  return value.toLocaleString(undefined, {
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
  const [appliedPeriodMode, setAppliedPeriodMode] = useState<PeriodMode>("month");
  const [appliedSelectedMonth, setAppliedSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  );
  const [appliedSelectedYear, setAppliedSelectedYear] = useState(String(currentYear));

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSpendingCategories, setShowAllSpendingCategories] = useState(false);
  const [showAllEarningCategories, setShowAllEarningCategories] = useState(false);
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const chartsContainerRef = useRef<HTMLDivElement | null>(null);
  const profile = useAtomValue(profileAtom);
  const includePending = Boolean(profile?.bookAllTransactions);

  const periodOptions = useMemo(
    () => getPeriodOptionsFromTransactions(allTransactions),
    [allTransactions]
  );
  const range = useMemo(
    () => getRange(appliedPeriodMode, appliedSelectedMonth, appliedSelectedYear),
    [appliedPeriodMode, appliedSelectedMonth, appliedSelectedYear]
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
        const [accountsRes, categoriesRes, txRes, allTxRes] = await Promise.all([
          fetch("/api/account", { credentials: "include" }),
          fetch("/api/category", { credentials: "include" }),
          fetch(`/api/transaction?${txParams.toString()}`, { credentials: "include" }),
          fetch(`/api/transaction?${new URLSearchParams({ includePending: String(includePending) }).toString()}`, { credentials: "include" }),
        ]);

        if (!accountsRes.ok || !categoriesRes.ok || !txRes.ok || !allTxRes.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const accountsData = await accountsRes.json();
        const categoriesData = await categoriesRes.json();
        const txData = await txRes.json();
        const allTxData = await allTxRes.json();

        setAccounts(accountsData.accounts ?? []);
        setCategories(categoriesData.categories ?? []);
        setTransactions(txData.transactions ?? []);
        setAllTransactions(allTxData.transactions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, [range.start, balanceCutoff, includePending]);

  useEffect(() => {
    if (periodOptions.years.length === 0) return;
    if (!periodOptions.years.includes(appliedSelectedYear)) {
      setAppliedSelectedYear(periodOptions.years[0]);
    }
  }, [periodOptions.years, appliedSelectedYear]);

  useEffect(() => {
    if (appliedPeriodMode !== "month") return;
    const months = periodOptions.monthsByYear[appliedSelectedYear] ?? [];
    if (months.length === 0) return;
    const appliedMonthPart = appliedSelectedMonth.split("-")[1] ?? "";
    if (!appliedSelectedMonth.startsWith(`${appliedSelectedYear}-`) || !months.includes(appliedMonthPart)) {
      setAppliedSelectedMonth(`${appliedSelectedYear}-${months[0]}`);
    }
  }, [appliedPeriodMode, periodOptions.monthsByYear, appliedSelectedYear, appliedSelectedMonth]);

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

  const netWorth = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts]
  );

  const cashflowChartData = useMemo(() => {
    const bucket = new Map<string, { label: string; income: number; expense: number; net: number }>();
    if (appliedPeriodMode === "month") {
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
  }, [transactions, appliedPeriodMode, range.start]);

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

  const expenseStackedData = useMemo(() => {
    const result: Array<Record<string, number | string>> = [];
    const buckets = new Map<string, Record<string, number | string>>();

    const topCategoryIds = categorySpendData.slice(0, 5).map((c) => c.categoryId);
    const topCategoryIdSet = new Set(topCategoryIds);

    if (appliedPeriodMode === "month") {
      const daysInMonth = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = String(day);
        buckets.set(key, { label: key });
      }
    } else {
      for (let month = 0; month < 12; month += 1) {
        const label = new Date(range.start.getFullYear(), month, 1).toLocaleString(undefined, {
          month: "short",
        });
        buckets.set(String(month), { label });
      }
    }

    for (const tx of transactions) {
      if (tx.type !== "EXPENSE") continue;
      const d = new Date(tx.occurredAt);
      if (Number.isNaN(d.getTime())) continue;

      let bucketKey: string;

      if (appliedPeriodMode === "month") {
        const day = d.getDate();
        bucketKey = String(day);
      } else {
        const month = d.getMonth();
        bucketKey = String(month);
      }

      const existing = buckets.get(bucketKey);
      if (!existing) continue;
      const amount = parseAmount(tx.amount);
      const category = categoryById.get(tx.category);
      const categoryName = topCategoryIdSet.has(tx.category) ? (category?.name ?? "Other") : "Other";

      const currentValue = typeof existing[categoryName] === "number" ? (existing[categoryName] as number) : 0;
      existing[categoryName] = currentValue + amount;
      buckets.set(bucketKey, existing);
    }

    if (appliedPeriodMode === "month") {
      const keys = Array.from(buckets.keys()).map(Number).sort((a, b) => a - b);
      for (const key of keys) {
        const value = buckets.get(String(key));
        if (value) result.push(value);
      }
    } else {
      const keys = Array.from(buckets.keys()).map(Number).sort((a, b) => a - b);
      for (const key of keys) {
        const value = buckets.get(String(key));
        if (value) result.push(value);
      }
    }

    return result;
  }, [transactions, appliedPeriodMode, range.start, categorySpendData, categoryById]);

  const expenseStackKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of expenseStackedData) {
      Object.keys(row).forEach((key) => {
        if (key !== "label") keys.add(key);
      });
    }
    return Array.from(keys);
  }, [expenseStackedData]);

  const stackedCategoryColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of categorySpendData) {
      if (row.color) {
        map.set(row.category, row.color);
      }
    }
    map.set("Other", "#6b7280");
    return map;
  }, [categorySpendData]);

  const expenseStackChartConfig = useMemo(
    () =>
      Object.fromEntries(
        expenseStackKeys.map((key) => [
          key,
          {
            label: key,
            color: stackedCategoryColors.get(key) ?? "#6b7280",
          },
        ])
      ) as ChartConfig,
    [expenseStackKeys, stackedCategoryColors]
  );

  const radarSpendData = useMemo(
    () => categorySpendData.slice(0, 8),
    [categorySpendData]
  );

  const radarSpendBucketData = useMemo(() => {
    const buckets = new Map<string, { label: string; spent: number }>();

    if (appliedPeriodMode === "month") {
      const daysInMonth = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = String(day);
        buckets.set(key, { label: key, spent: 0 });
      }
    } else {
      for (let month = 0; month < 12; month += 1) {
        const label = new Date(range.start.getFullYear(), month, 1).toLocaleString(undefined, {
          month: "short",
        });
        buckets.set(String(month), { label, spent: 0 });
      }
    }

    for (const tx of transactions) {
      if (tx.type !== "EXPENSE") continue;
      const d = new Date(tx.occurredAt);
      if (Number.isNaN(d.getTime())) continue;

      let bucketKey: string;
      if (appliedPeriodMode === "month") {
        const day = d.getDate();
        bucketKey = String(day);
      } else {
        const month = d.getMonth();
        bucketKey = String(month);
      }

      const existing = buckets.get(bucketKey);
      if (!existing) continue;
      const amount = parseAmount(tx.amount);
      existing.spent += amount;
      buckets.set(bucketKey, existing);
    }

    const orderedKeys = Array.from(buckets.keys())
      .map(Number)
      .sort((a, b) => a - b);

    return orderedKeys
      .map((key) => buckets.get(String(key)))
      .filter((value): value is { label: string; spent: number } => Boolean(value));
  }, [transactions, appliedPeriodMode, range.start]);

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

    return Array.from(stats.values())
      .map((row) => ({
        ...row,
        displayedBalance: row.account.balance,
      }))
      .sort((a, b) => a.account.name.localeCompare(b.account.name));
  }, [accounts, transactions]);

  const categoryTooltipFormatter = (
    value: number | string,
    name: string
  ) => {
    const numeric =
      typeof value === "number" ? value : Number(value ?? 0);
    return (
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-muted-foreground">{name}</span>
        <span className="font-mono font-medium tabular-nums text-foreground">
          {Number.isFinite(numeric) ? numeric.toLocaleString() : value}
        </span>
      </div>
    );
  };

  const handleChartsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (!target) return;
    const width = target.clientWidth || 1;
    const index = Math.round(target.scrollLeft / width);
    const clamped = Math.max(0, Math.min(2, index));
    if (clamped !== activeChartIndex) {
      setActiveChartIndex(clamped);
    }
  };

  const scrollToChart = (index: number) => {
    const container = chartsContainerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    container.scrollTo({
      left: width * index,
      behavior: "smooth",
    });
  };

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="relative space-y-6">
      <div className="fixed right-6 top-6 z-40">
        <PeriodFilterPopover
          appliedMode={appliedPeriodMode}
          appliedYear={appliedSelectedYear}
          appliedMonth={appliedSelectedMonth}
          years={periodOptions.years}
          monthsByYear={periodOptions.monthsByYear}
          triggerAriaLabel="Open dashboard filters"
          onApply={({ mode, year, month }) => {
            setAppliedPeriodMode(mode);
            setAppliedSelectedYear(year);
            setAppliedSelectedMonth(month);
          }}
        />
      </div>

      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <div>
          <div>
            <h2 className="text-lg font-semibold">Financial Overview</h2>
            <p className="text-sm text-muted-foreground">
              Filtered for <span className="font-medium">{range.label}</span>.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Net Worth</p>
            <p className={`text-lg font-semibold ${netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
              EUR {netWorth.toLocaleString()}
            </p>
          </div>
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
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <h3 className="mb-1 text-base font-semibold">Cashflow & categories</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Swipe to explore cashflow, stacked spending, and radar view.
        </p>

        <div
          ref={chartsContainerRef}
          onScroll={handleChartsScroll}
          className="relative flex w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
        >
          {/* Page 1 – cashflow areas */}
          <div className="min-w-full shrink-0 snap-center">
            <ChartContainer config={cashflowChartConfig} className="h-[260px] w-full">
              <ComposedChart data={cashflowChartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="#16a34a"
                  fillOpacity={0.12}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fill="#dc2626"
                  fillOpacity={0.18}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  name="Net"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="#2563eb"
                  fillOpacity={0.08}
                  isAnimationActive={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </ComposedChart>
            </ChartContainer>
          </div>

          {/* Page 2 – stacked expenses per bucket (day/month) */}
          <div className="min-w-full shrink-0 snap-center">
            <ChartContainer config={expenseStackChartConfig} className="h-[260px] w-full">
              <BarChart data={expenseStackedData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {expenseStackKeys.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="expenses"
                    fill={stackedCategoryColors.get(key) ?? "#6b7280"}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </div>

          {/* Page 3 – radar chart of spending by category */}
          <div className="min-w-full shrink-0 snap-center">
            <div className="h-[260px] w-full flex items-center justify-center">
              {radarSpendData.filter((c) => c.spent > 0).length < 3 &&
              radarSpendBucketData.filter((b) => b.spent > 0).length < 3 ? (
                <p className="text-xs text-muted-foreground text-center px-6">
                  Not enough data for meaningful radar charts in the selected period.
                </p>
              ) : (
                <div className="flex h-full w-full gap-4">
                  {radarSpendData.filter((c) => c.spent > 0).length >= 3 && (
                    <ChartContainer config={spendingChartConfig} className="h-full w-1/2">
                      <RadarChart data={radarSpendData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis tick={false} />
                        <Radar
                          name="Spent (EUR)"
                          dataKey="spent"
                          stroke="#dc2626"
                          fill="#dc2626"
                          fillOpacity={0.25}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </RadarChart>
                    </ChartContainer>
                  )}
                  {radarSpendBucketData.filter((b) => b.spent > 0).length >= 3 && (
                    <ChartContainer config={spendingChartConfig} className="h-full w-1/2">
                      <RadarChart data={radarSpendBucketData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis tick={false} />
                        <Radar
                          name="Spent (EUR)"
                          dataKey="spent"
                          stroke="#dc2626"
                          fill="#dc2626"
                          fillOpacity={0.25}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </RadarChart>
                    </ChartContainer>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* iOS-style dots */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToChart(index)}
              className={
                index === activeChartIndex
                  ? "h-2.5 w-5 rounded-full bg-foreground transition-all"
                  : "h-2 w-2 rounded-full bg-muted-foreground/40 transition-all"
              }
              aria-label={`Go to chart ${index + 1}`}
            />
          ))}
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
                  <p className="text-xs text-muted-foreground">Current balance</p>
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

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <h3 className="mb-1 text-base font-semibold">Spending by Category</h3>
          <p className="mb-4 text-xs text-muted-foreground">Only expense transactions are included.</p>
          <ChartContainer config={spendingChartConfig} className="h-[260px] w-full">
            <BarChart data={categorySpendData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={false} tickLine={false} axisLine={false} />
              <YAxis />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="category"
                    formatter={(value, name) =>
                      categoryTooltipFormatter(value as number, String(name))
                    }
                  />
                }
                cursor={false}
              />
              <Bar
                dataKey="spent"
                name="Spent (EUR)"
                fill="#dc2626"
                radius={[6, 6, 0, 0]}
                activeBar={false}
              />
            </BarChart>
          </ChartContainer>
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
          <ChartContainer config={earningChartConfig} className="h-[260px] w-full">
            <BarChart data={categoryIncomeData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={false} tickLine={false} axisLine={false} />
              <YAxis />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="category"
                    formatter={(value, name) =>
                      categoryTooltipFormatter(value as number, String(name))
                    }
                  />
                }
                cursor={false}
              />
              <Bar
                dataKey="earned"
                name="Earned (EUR)"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
                activeBar={false}
              />
            </BarChart>
          </ChartContainer>
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
