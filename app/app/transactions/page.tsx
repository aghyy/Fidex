"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Skeleton from "@/components/ui/skeleton";
import TransactionsManager from "@/components/transactions/TransactionsManager";
import TransactionFAB from "@/components/transactions/TransactionFAB";
import PeriodFilterPopover from "@/components/filters/PeriodFilterPopover";

type PeriodMode = "month" | "year";
type Tx = { occurredAt?: string; createdAt: string };

function getPeriodOptionsFromTransactions(transactions: Tx[]) {
  const yearSet = new Set<string>();
  const monthsByYear = new Map<string, Set<string>>();
  for (const tx of transactions) {
    const d = new Date(tx.occurredAt ?? tx.createdAt);
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
    const [yy, mm] = monthValue.split("-").map(Number);
    const start = new Date(yy, mm - 1, 1, 0, 0, 0, 0);
    const end = new Date(yy, mm, 0, 23, 59, 59, 999);
    return { start, end };
  }

  const year = Number(yearValue || now.getFullYear());
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export default function TransactionsPage() {
  const { status } = useSession();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [allTransactions, setAllTransactions] = useState<Tx[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  useEffect(() => {
    async function loadTransactions() {
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/transaction", { credentials: "include" });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setAllTransactions((data.transactions ?? []) as Tx[]);
      } catch {
        setAllTransactions([]);
      }
    }

    void loadTransactions();
  }, [status]);

  const periodOptions = useMemo(
    () => getPeriodOptionsFromTransactions(allTransactions),
    [allTransactions]
  );
  const selectedMonthPart = selectedMonth.split("-")[1] ?? "";
  const range = useMemo(
    () => getRange(periodMode, selectedMonth, selectedYear),
    [periodMode, selectedMonth, selectedYear]
  );
  const effectiveTo = useMemo(() => {
    const now = new Date();
    return range.end.getTime() > now.getTime() ? now : range.end;
  }, [range.end]);

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

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-56 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-background p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-1/2 mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <div className="ml-auto">
            <PeriodFilterPopover
              appliedMode={periodMode}
              appliedYear={selectedYear}
              appliedMonth={selectedMonth}
              years={periodOptions.years}
              monthsByYear={periodOptions.monthsByYear}
              triggerAriaLabel="Open transaction filters"
              onApply={({ mode, year, month }) => {
                setPeriodMode(mode);
                setSelectedYear(year);
                setSelectedMonth(month);
              }}
            />
          </div>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Currently only EUR is available.</p>
        <TransactionsManager from={range.start.toISOString()} to={effectiveTo.toISOString()} />
      </div>
      <TransactionFAB />
    </>
  );
}