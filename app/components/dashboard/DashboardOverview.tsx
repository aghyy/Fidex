"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Rectangle,
} from "recharts";
import type { RectangleProps } from "recharts";
import { Account } from "@/types/accounts";
import { Category } from "@/types/categories";
import { TransactionType } from "@/types/transactions";
import { Button } from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";
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
import { formatEurAmount } from "@/lib/money";
import EditTransactionDialog from "@/components/transactions/EditTransactionDialog";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  MorphingDialog,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogTitle,
  MorphingDialogTrigger,
} from "@/components/motion-primitives/morphing-dialog";

type DashboardTransaction = {
  id: string;
  originAccountId: string;
  targetAccountId: string;
  amount: string;
  notes: string;
  interval: string;
  type: TransactionType;
  category: string;
  occurredAt: string;
  pending: boolean;
  createdAt: string;
  expires: string;
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

export function DashboardOverviewSkeleton() {
  return (
    <div className="relative space-y-6">
      <div className="fixed right-6 top-6 z-40">
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="rounded-2xl glass-card p-4 sm:p-6">
        <Skeleton className="h-5 w-48 max-w-full sm:max-w-none" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-[70%]" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl glass-card p-4 sm:p-6">
        <Skeleton className="h-5 w-56 max-w-full" />
        <Skeleton className="mt-1 h-3 w-full max-w-md" />
        <Skeleton className="mt-4 h-[260px] w-full rounded-lg" />
        <div className="mt-3 flex items-center justify-center gap-2">
          <Skeleton className="h-2.5 w-5 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
      </div>

      <div className="rounded-2xl glass-card p-4 sm:p-6">
        <Skeleton className="h-5 w-40 mb-3" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg glass-tile p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="ml-auto h-4 w-20" />
                  <Skeleton className="ml-auto h-3 w-28" />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="rounded-2xl glass-card p-4 sm:p-6">
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="mt-1 h-3 w-full max-w-sm" />
            <Skeleton className="mt-4 h-[260px] w-full rounded-lg" />
            <div className="mt-4 space-y-2">
              {[0, 1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between rounded-lg glass-tile p-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
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
  const [showAllPlannedTransactions, setShowAllPlannedTransactions] = useState(false);
  const [deleteConfirmTransaction, setDeleteConfirmTransaction] = useState<DashboardTransaction | null>(null);
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [hasLoadedChartIndex, setHasLoadedChartIndex] = useState(false);
  const isFilterChangeInProgress = useRef(false);
  const pendingChartIndex = useRef<number | null>(null);
  const scrollSuppressUntil = useRef(0);
  const [hasLoadedPeriodFilter, setHasLoadedPeriodFilter] = useState(false);
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

  // Restore last used period filter from previous sessions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedMode = window.localStorage.getItem("dashboardPeriodMode") as PeriodMode | null;
    const storedYear = window.localStorage.getItem("dashboardPeriodYear");
    const storedMonth = window.localStorage.getItem("dashboardPeriodMonth");

    if (storedMode === "month" || storedMode === "year") {
      setAppliedPeriodMode(storedMode);
    }
    if (storedYear) {
      setAppliedSelectedYear(storedYear);
    }
    if (storedMonth) {
      setAppliedSelectedMonth(storedMonth);
    }

    setHasLoadedPeriodFilter(true);
  }, []);

  // Persist period filter so it's remembered across reloads.
  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedPeriodFilter) return;
    window.localStorage.setItem("dashboardPeriodMode", appliedPeriodMode);
    window.localStorage.setItem("dashboardPeriodYear", appliedSelectedYear);
    window.localStorage.setItem("dashboardPeriodMonth", appliedSelectedMonth);
  }, [appliedPeriodMode, appliedSelectedYear, appliedSelectedMonth, hasLoadedPeriodFilter]);

  const loadDashboardData = useCallback(async () => {
    if (!hasLoadedPeriodFilter) return;
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
          fetch(`/api/transaction?${new URLSearchParams({ includePending: "true" }).toString()}`, { credentials: "include" }),
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
  }, [range.start, balanceCutoff, includePending, hasLoadedPeriodFilter]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    if (!hasLoadedPeriodFilter) return;

    async function load() {
      setLoading(true);
      await loadDashboardData();
    }

    void load();
  }, [sessionStatus, hasLoadedPeriodFilter, loadDashboardData]);

  const handleDeletePlannedTransaction = useCallback(async () => {
    if (!deleteConfirmTransaction) return;
    try {
      const res = await fetch(`/api/transaction/${deleteConfirmTransaction.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete transaction");
      setTransactions((prev) => prev.filter((t) => t.id !== deleteConfirmTransaction.id));
      setAllTransactions((prev) => prev.filter((t) => t.id !== deleteConfirmTransaction.id));
      setDeleteConfirmTransaction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete transaction");
      throw err;
    }
  }, [deleteConfirmTransaction]);

  // When data finishes reloading after a filter change, allow scroll-sync again.
  useEffect(() => {
    if (!loading && isFilterChangeInProgress.current) {
      isFilterChangeInProgress.current = false;
      // Ensure we stay on the same chart index after filter changes.
      scrollToChart(pendingChartIndex.current ?? activeChartIndex);
      pendingChartIndex.current = null;
    }
  }, [loading, activeChartIndex]);

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

  const radarIncomeData = useMemo(
    () => categoryIncomeData.slice(0, 8),
    [categoryIncomeData]
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

  const plannedTransactions = useMemo(() => {
    const now = new Date();
    return allTransactions
      .filter((tx) => {
        const occurredAt = new Date(tx.occurredAt);
        return !Number.isNaN(occurredAt.getTime()) && occurredAt.getTime() > now.getTime();
      })
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  }, [allTransactions]);

  const visiblePlannedTransactions = useMemo(
    () =>
      showAllPlannedTransactions
        ? plannedTransactions
        : plannedTransactions.slice(0, categoryListDefaultLimit),
    [showAllPlannedTransactions, plannedTransactions, categoryListDefaultLimit]
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
          {Number.isFinite(numeric) ? formatEurAmount(numeric) : value}
        </span>
      </div>
    );
  };

  type StackedBarShapeProps = RectangleProps & {
    stackKeys: string[];
    payload: Record<string, unknown>;
    dataKey: string | number;
  };

  const StackedBarSegment = (props: StackedBarShapeProps) => {
    const { stackKeys, payload, dataKey } = props;
    const keyIndex = stackKeys.indexOf(String(dataKey));
    // Determine if this segment is the topmost non-zero segment for this x-value.
    const isTopForThisX =
      keyIndex === stackKeys.length - 1 ||
      stackKeys
        .slice(keyIndex + 1)
        .every((key) => {
          const v = payload?.[key];
          const n = typeof v === "number" ? v : Number(v ?? 0);
          return !Number.isFinite(n) || n <= 0;
        });

    const radius: [number, number, number, number] = isTopForThisX
      ? [4, 4, 0, 0]
      : [0, 0, 0, 0];

    return <Rectangle {...props} radius={radius} />;
  };

  const handleChartsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (loading || isFilterChangeInProgress.current) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now < scrollSuppressUntil.current) return;
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
    if (!width) return;
    // Suppress scroll-sync for a short window so programmatic scrolls
    // don't immediately get interpreted as user scrolls.
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    scrollSuppressUntil.current = now + 400;
    container.scrollTo({
      left: width * index,
      behavior: "auto",
    });
  };

  // Restore last viewed chart from previous sessions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("dashboardActiveChartIndex");
    if (stored != null) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 2) {
        setActiveChartIndex(parsed);
      }
    }
    setHasLoadedChartIndex(true);
  }, []);

  // After initial load (and reloads), ensure we snap to the restored chart once.
  useEffect(() => {
    if (!hasLoadedChartIndex || loading) return;
    requestAnimationFrame(() => {
      scrollToChart(activeChartIndex);
    });
  }, [hasLoadedChartIndex, loading, activeChartIndex]);

  // Persist active chart index so it's remembered across reloads.
  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedChartIndex) return;
    window.localStorage.setItem("dashboardActiveChartIndex", String(activeChartIndex));
  }, [activeChartIndex, hasLoadedChartIndex]);

  if (sessionStatus === "loading") {
    return <DashboardOverviewSkeleton />;
  }

  if (sessionStatus === "unauthenticated") {
    return null;
  }

  if (loading) {
    return <DashboardOverviewSkeleton />;
  }

  if (error) {
    return <div className="rounded-2xl glass-card p-6 text-sm text-red-500">{error}</div>;
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
            // Remember current chart across filter changes.
            isFilterChangeInProgress.current = true;
            pendingChartIndex.current = activeChartIndex;
            setAppliedPeriodMode(mode);
            setAppliedSelectedYear(year);
            setAppliedSelectedMonth(month);
          }}
        />
      </div>

      <div className="rounded-2xl glass-card p-4 sm:p-6">
        <div>
          <div>
            <h2 className="text-lg font-semibold">Financial Overview</h2>
            <p className="text-sm text-muted-foreground">
              Filtered for <span className="font-medium">{range.label}</span>.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Net Worth</p>
            <p className={`text-lg font-semibold ${netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
              EUR {formatEurAmount(netWorth)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-semibold text-green-600">EUR {formatEurAmount(totals.income)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expense</p>
            <p className="text-lg font-semibold text-red-600">EUR {formatEurAmount(totals.expense)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={`text-lg font-semibold ${totals.net >= 0 ? "text-green-600" : "text-red-600"}`}>
              EUR {formatEurAmount(totals.net)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl glass-card p-4 sm:p-6">
        <h3 className="mb-4 text-base font-semibold">Cashflow & categories</h3>

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
                    shape={(barProps: unknown) => (
                      <StackedBarSegment
                        {...(barProps as RectangleProps & {
                          payload: Record<string, unknown>;
                          dataKey: string | number;
                        })}
                        stackKeys={expenseStackKeys}
                      />
                    )}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </div>

          {/* Page 3 – radar charts */}
          <div className="min-w-full shrink-0 snap-center">
            <div className="h-[260px] w-full flex items-center justify-center">
              {radarSpendData.filter((c) => c.spent > 0).length < 3 &&
              radarSpendBucketData.filter((b) => b.spent > 0).length < 1 &&
              radarIncomeData.filter((c) => c.earned > 0).length < 3 ? (
                <p className="text-xs text-muted-foreground text-center px-6">
                  Not enough data for meaningful radar charts in the selected period.
                </p>
              ) : (
                <div className="flex h-full w-full gap-4">
                  {radarSpendData.filter((c) => c.spent > 0).length >= 3 && (
                    <ChartContainer config={spendingChartConfig} className="h-full w-1/3">
                      <RadarChart data={radarSpendData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis tick={false} axisLine={false} />
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
                  {radarSpendBucketData.filter((b) => b.spent > 0).length >= 1 && (
                    <ChartContainer config={spendingChartConfig} className="h-full w-1/3">
                      <RadarChart data={radarSpendBucketData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis tick={false} axisLine={false} />
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
                  {radarIncomeData.filter((c) => c.earned > 0).length >= 3 && (
                    <ChartContainer config={earningChartConfig} className="h-full w-1/3">
                      <RadarChart data={radarIncomeData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis tick={false} axisLine={false} />
                        <Radar
                          name="Earned (EUR)"
                          dataKey="earned"
                          stroke="#22c55e"
                          fill="#22c55e"
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
              onClick={() => {
                // Directly set the active index for immediate visual feedback,
                // then perform a programmatic scroll (which is ignored by the
                // scroll handler via the isProgrammaticScroll flag).
                setActiveChartIndex(index);
                scrollToChart(index);
              }}
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

      <div className="rounded-2xl glass-card p-4 sm:p-6">
        <h3 className="mb-3 text-base font-semibold">Accounts Overview</h3>
        <div className="space-y-2">
          {accountOverview.map((row) => (
            <Link
              key={row.account.id}
              href={`/accounts/${encodeURIComponent(row.account.id)}`}
              className="block rounded-lg glass-tile glass-tile-hover p-3"
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
                    EUR {formatEurAmount(row.displayedBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">Current balance</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <p className="text-muted-foreground">Income: EUR {formatEurAmount(row.income)}</p>
                <p className="text-muted-foreground">Expense: EUR {formatEurAmount(row.expense)}</p>
                <p className={row.net >= 0 ? "text-green-600" : "text-red-600"}>Net: EUR {formatEurAmount(row.net)}</p>
                <p className="text-muted-foreground">Transactions: {row.txCount}</p>
              </div>
            </Link>
          ))}
          {accountOverview.length === 0 ? <p className="text-sm text-muted-foreground">No accounts available.</p> : null}
        </div>
      </div>

      <div className="rounded-2xl glass-card p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Planned Transactions</h3>
          </div>
          <Button asChild type="button" variant="glass" size="sm">
            <Link href="/transactions">Manage</Link>
          </Button>
        </div>
        <div className="space-y-2">
          {visiblePlannedTransactions.map((tx) => {
            const amount = parseAmount(tx.amount);
            const category = categoryById.get(tx.category);
            const occurredAt = new Date(tx.occurredAt);
            const txTypeLabel =
              tx.type === "INCOME" ? "Income" : tx.type === "EXPENSE" ? "Expense" : "Transfer";
            const amountClassName =
              tx.type === "INCOME"
                ? "text-green-600"
                : tx.type === "EXPENSE"
                  ? "text-red-600"
                  : "text-blue-600";

            return (
              <MorphingDialog key={tx.id}>
                <div className="flex items-center justify-between rounded-lg glass-tile p-1">
                  <MorphingDialogTrigger
                    className="h-auto flex-1 rounded-md p-2 text-left text-foreground"
                    aria-label="Open planned transaction details"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{category?.name ?? "Unknown category"}</p>
                        <p className="text-xs text-muted-foreground">
                          {txTypeLabel} ·{" "}
                          {Number.isNaN(occurredAt.getTime())
                            ? "Invalid date"
                            : occurredAt.toLocaleDateString()}
                        </p>
                      </div>
                      <p className={`shrink-0 text-sm font-semibold ${amountClassName}`}>
                        {tx.type === "EXPENSE" ? "-" : tx.type === "INCOME" ? "+" : ""}
                        EUR {formatEurAmount(amount)}
                      </p>
                    </div>
                  </MorphingDialogTrigger>
                  <div className="ml-1 flex items-center gap-1">
                    <EditTransactionDialog
                      transaction={tx}
                      accounts={accounts}
                      categories={categories}
                      onUpdated={(updated) => {
                        setTransactions((prev) =>
                          prev.map((transaction) => (transaction.id === updated.id ? updated : transaction))
                        );
                        setAllTransactions((prev) =>
                          prev.map((transaction) => (transaction.id === updated.id ? updated : transaction))
                        );
                        void loadDashboardData();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTransaction(tx)}
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                      aria-label="Delete planned transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <MorphingDialogContainer>
                  <MorphingDialogContent
                    className="w-full max-w-2xl rounded-2xl glass-dialog p-5 shadow-xl"
                    style={{ overflow: "visible" }}
                  >
                    <MorphingDialogTitle className="text-xl">Transaction Details</MorphingDialogTitle>
                    <MorphingDialogDescription className="text-sm text-muted-foreground">
                      Read-only transaction information.
                    </MorphingDialogDescription>
                    <div className="mt-4 space-y-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-base font-semibold">{category?.name ?? "Unknown category"}</p>
                        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                          <p>
                            <span className="text-muted-foreground">Amount:</span>{" "}
                            <span className={amountClassName}>EUR {formatEurAmount(amount)}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Type:</span> {txTypeLabel}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Status:</span>{" "}
                            {tx.pending ? "Pending" : "Booked"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Date:</span>{" "}
                            {Number.isNaN(occurredAt.getTime())
                              ? "Invalid date"
                              : occurredAt.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border p-3 text-sm">
                        <p className="text-muted-foreground">Notes</p>
                        <p className="mt-1 whitespace-pre-wrap">{tx.notes?.trim() ? tx.notes : "-"}</p>
                      </div>
                    </div>
                  </MorphingDialogContent>
                </MorphingDialogContainer>
              </MorphingDialog>
            );
          })}
          {plannedTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No planned transactions.</p>
          ) : null}
          {plannedTransactions.length > categoryListDefaultLimit ? (
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={() => setShowAllPlannedTransactions((prev) => !prev)}
            >
              {showAllPlannedTransactions
                ? "Show less"
                : `Show more (${plannedTransactions.length - categoryListDefaultLimit} more)`}
            </Button>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={deleteConfirmTransaction !== null}
        onOpenChange={(open) => !open && setDeleteConfirmTransaction(null)}
        title="Delete transaction"
        description="Are you sure you want to delete this transaction? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeletePlannedTransaction}
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <div className="rounded-2xl glass-card p-4 sm:p-6">
          <h3 className="mb-4 text-base font-semibold">Spending by Category</h3>
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
                className="flex items-center justify-between rounded-lg glass-tile glass-tile-hover p-3"
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
                <p className="font-semibold text-red-600">EUR {formatEurAmount(row.spent)}</p>
              </Link>
            ))}
            {categorySpendData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense transactions in the selected timespan.</p>
            ) : null}
            {categorySpendData.length > categoryListDefaultLimit ? (
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => setShowAllSpendingCategories((prev) => !prev)}
              >
                {showAllSpendingCategories ? "Show less" : `Show more (${categorySpendData.length - categoryListDefaultLimit} more)`}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl glass-card p-4 sm:p-6">
          <h3 className="mb-4 text-base font-semibold">Earnings by Category</h3>
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
                className="flex items-center justify-between rounded-lg glass-tile glass-tile-hover p-3"
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
                <p className="font-semibold text-green-600">EUR {formatEurAmount(row.earned)}</p>
              </Link>
            ))}
            {categoryIncomeData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No income transactions in the selected timespan.</p>
            ) : null}
            {categoryIncomeData.length > categoryListDefaultLimit ? (
              <Button
                type="button"
                variant="glass"
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
