"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import TransactionsManager from "@/components/transactions/TransactionsManager";
import TransactionFAB from "@/components/transactions/TransactionFAB";
import { Account } from "@/types/accounts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PeriodMode = "month" | "year";

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

type AccountTransaction = {
  id: string;
  originAccountId: string;
  targetAccountId: string;
  amount: string | number;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  createdAt: string;
};

function parseAmount(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPeriodOptionsFromTransactions(transactions: AccountTransaction[]) {
  const yearSet = new Set<string>();
  const monthsByYear = new Map<string, Set<string>>();
  for (const tx of transactions) {
    const d = new Date(tx.createdAt);
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

export default function AccountDetailPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [account, setAccount] = useState<Account | null>(null);
  const [resolvedAccountId, setResolvedAccountId] = useState("");
  const [allAccountTransactions, setAllAccountTransactions] = useState<AccountTransaction[]>([]);
  const [displayedBalance, setDisplayedBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const periodOptions = useMemo(
    () => getPeriodOptionsFromTransactions(allAccountTransactions),
    [allAccountTransactions]
  );
  const selectedMonthPart = selectedMonth.split("-")[1] ?? "";
  const monthOptionsForSelectedYear = periodOptions.monthsByYear[selectedYear] ?? [];
  const range = useMemo(
    () => getRange(periodMode, selectedMonth, selectedYear),
    [periodMode, selectedMonth, selectedYear]
  );
  const effectiveTo = useMemo(() => {
    const current = new Date();
    return range.end.getTime() > current.getTime() ? current : range.end;
  }, [range.end]);

  useEffect(() => {
    async function loadAccount() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/account/${id}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setAccount(data.account ?? null);
          setDisplayedBalance(data.account?.balance ?? null);
          setResolvedAccountId(data.account?.id ?? id);
          return;
        }

        // Backward compatibility: old links used account name slugs.
        const listRes = await fetch("/api/account", { credentials: "include" });
        if (!listRes.ok) throw new Error("Failed to fetch account");
        const listData = await listRes.json();
        const decoded = decodeURIComponent(id).toLowerCase();
        const fallback = (listData.accounts ?? []).find(
          (a: Account) => a.name.toLowerCase() === decoded
        ) as Account | undefined;
        setAccount(fallback ?? null);
        setDisplayedBalance(fallback?.balance ?? null);
        setResolvedAccountId(fallback?.id ?? id);
      } catch {
        setAccount(null);
        setDisplayedBalance(null);
        setResolvedAccountId(id);
      } finally {
        setLoading(false);
      }
    }

    void loadAccount();
  }, [id]);

  useEffect(() => {
    async function loadAllAccountTransactions() {
      if (!resolvedAccountId) return;
      try {
        const params = new URLSearchParams({ accountId: resolvedAccountId });
        const res = await fetch(`/api/transaction?${params.toString()}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data = await res.json();
        setAllAccountTransactions((data.transactions ?? []) as AccountTransaction[]);
      } catch {
        setAllAccountTransactions([]);
      }
    }

    void loadAllAccountTransactions();
  }, [resolvedAccountId]);

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

  useEffect(() => {
    async function loadFilteredBalance() {
      if (!account || !resolvedAccountId) return;
      try {
        const params = new URLSearchParams({
          accountId: resolvedAccountId,
          from: new Date(effectiveTo.getTime() + 1).toISOString(),
        });
        const res = await fetch(`/api/transaction?${params.toString()}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data = await res.json();
        const txs = (data.transactions ?? []) as AccountTransaction[];

        let adjustment = 0;
        for (const tx of txs) {
          const amount = parseAmount(tx.amount);
          if (tx.type === "EXPENSE" && tx.originAccountId === resolvedAccountId) {
            adjustment += amount;
          } else if (tx.type === "INCOME" && tx.originAccountId === resolvedAccountId) {
            adjustment -= amount;
          } else if (tx.type === "TRANSFER") {
            if (tx.originAccountId === resolvedAccountId) adjustment += amount;
            if (tx.targetAccountId === resolvedAccountId) adjustment -= amount;
          }
        }

        setDisplayedBalance(account.balance + adjustment);
      } catch {
        setDisplayedBalance(account.balance);
      }
    }

    void loadFilteredBalance();
  }, [account, resolvedAccountId, effectiveTo]);

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/"
            className="p-1 hover:bg-accent rounded transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">Account</h1>
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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

        <div className="mb-6 rounded-xl border bg-background p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading account...</p>
          ) : account ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{account.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account Number</p>
                <p className="font-medium">{account.accountNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-medium">EUR {(displayedBalance ?? account.balance).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">As of {effectiveTo.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium">EUR (currently only supported)</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Account not found.</p>
          )}
        </div>

        <h2 className="mb-3 text-lg font-semibold">Transactions</h2>
        <TransactionsManager
          accountFilter={resolvedAccountId || id}
          from={range.start.toISOString()}
          to={effectiveTo.toISOString()}
        />
      </div>
      <TransactionFAB preselectedAccount={resolvedAccountId || id} />
    </>
  );
}


