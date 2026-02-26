"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Skeleton from "@/components/ui/skeleton";
import BudgetsManager from "@/components/budgets/BudgetsManager";
import BudgetFAB from "@/components/budgets/BudgetFAB";
import PeriodFilterPopover from "@/components/filters/PeriodFilterPopover";

type PeriodMode = "month" | "year";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const periodYears = [currentYear, currentYear - 1, currentYear - 2].map(String);
const periodMonthsByYear: Record<string, string[]> = Object.fromEntries(
  periodYears.map((year) => [
    year,
    Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")),
  ])
);

function getBudgetRange(mode: PeriodMode, monthValue: string, yearValue: string) {
  const now = new Date();
  if (mode === "month") {
    const [yy, mm] = (
      monthValue || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    )
      .split("-")
      .map(Number);
    const start = new Date(yy, mm - 1, 1, 0, 0, 0, 0);
    const end = new Date(yy, mm, 0, 23, 59, 59, 999);
    return { start, end };
  }

  const year = Number(yearValue || now.getFullYear());
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export default function BudgetsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [appliedPeriodMode, setAppliedPeriodMode] = useState<PeriodMode>("month");
  const [appliedSelectedYear, setAppliedSelectedYear] = useState(String(currentYear));
  const [appliedSelectedMonth, setAppliedSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  const range = useMemo(
    () => getBudgetRange(appliedPeriodMode, appliedSelectedMonth, appliedSelectedYear),
    [appliedPeriodMode, appliedSelectedMonth, appliedSelectedYear]
  );
  const effectiveTo = useMemo(() => {
    const nowDate = new Date();
    return range.end.getTime() > nowDate.getTime() ? nowDate : range.end;
  }, [range.end]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-48 mb-6" />
        <div className="space-y-4">
          <div className="rounded-xl border bg-background p-5">
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="rounded-xl border bg-background p-5">
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold">Budgets</h1>
          <div className="ml-auto flex items-center gap-2">
            <PeriodFilterPopover
              appliedMode={appliedPeriodMode}
              appliedYear={appliedSelectedYear}
              appliedMonth={appliedSelectedMonth}
              years={periodYears}
              monthsByYear={periodMonthsByYear}
              triggerAriaLabel="Open budget filters"
              onApply={({ mode, year, month }) => {
                setAppliedPeriodMode(mode);
                setAppliedSelectedYear(year);
                setAppliedSelectedMonth(month);
              }}
            />
          </div>
        </div>
        <BudgetsManager from={range.start.toISOString()} to={effectiveTo.toISOString()} />
      </div>
      <BudgetFAB />
    </>
  );
}
