"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Skeleton from "@/components/ui/skeleton";
import BudgetsManager from "@/components/budgets/BudgetsManager";
import BudgetFAB from "@/components/budgets/BudgetFAB";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: new Date(2000, i, 1).toLocaleString(undefined, { month: "long" }),
}));

function getRange(year: number, month: string) {
  const y = year;
  const m = Number(month);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

export default function BudgetsPage() {
  const { status } = useSession();
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  const range = useMemo(() => getRange(Number(year), month), [year, month]);
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
            <span className="text-sm text-muted-foreground">Period</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-24 focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-32 focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <BudgetsManager from={range.start.toISOString()} to={effectiveTo.toISOString()} />
      </div>
      <BudgetFAB />
    </>
  );
}
