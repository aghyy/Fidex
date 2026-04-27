"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Skeleton from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { IconFileExport, IconCalendar } from "@tabler/icons-react";
import type { Account } from "@/types/accounts";
import type { Category } from "@/types/categories";

function toLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function FinancialStatementPage() {
  const { status } = useSession();
  const router = useRouter();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = now.getFullYear();

  const [fromDate, setFromDate] = useState<Date>(() => new Date(currentYear, 0, 1));
  const [toDate, setToDate] = useState<Date>(() => today);
  const [fromPopoverOpen, setFromPopoverOpen] = useState(false);
  const [toPopoverOpen, setToPopoverOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [includePending, setIncludePending] = useState(false);
  const [includePersonalInfo, setIncludePersonalInfo] = useState(true);
  const [includeTransactionList, setIncludeTransactionList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signup");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/account", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/category", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([accRes, catRes]) => {
        const accList = accRes?.accounts ?? [];
        const catList = catRes?.categories ?? [];
        setAccounts(accList);
        setCategories(catList);
        setSelectedAccountIds(new Set(accList.map((a: Account) => a.id)));
        setSelectedCategoryIds(new Set(catList.map((c: Category) => c.id)));
        setDataLoaded(true);
      })
      .catch(() => setDataLoaded(true));
  }, [status]);

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllAccounts = () => setSelectedAccountIds(new Set(accounts.map((a) => a.id)));
  const deselectAllAccounts = () => setSelectedAccountIds(new Set());
  const selectAllCategories = () => setSelectedCategoryIds(new Set(categories.map((c) => c.id)));
  const deselectAllCategories = () => setSelectedCategoryIds(new Set());

  const formatDateLabel = (d: Date) =>
    d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  const handleDownload = async () => {
    setError(null);
    setLoading(true);
    try {
      const from = toLocalISODate(fromDate);
      const to = toLocalISODate(toDate);
      const params = new URLSearchParams({ from, to });
      if (selectedAccountIds.size < accounts.length) {
        params.set("accounts", [...selectedAccountIds].join(","));
      }
      if (selectedCategoryIds.size < categories.length) {
        params.set("categories", [...selectedCategoryIds].join(","));
      }
      if (includePending) params.set("includePending", "true");
      if (!includePersonalInfo) params.set("includePersonalInfo", "false");
      if (!includeTransactionList) params.set("includeTransactionList", "false");

      const res = await fetch(`/api/financial-statement?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `Financial_Statement_${from}_to_${to}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-7 w-64" />
        </div>
        <section className="rounded-xl glass-card p-4 sm:p-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <div className="flex justify-end">
              <Skeleton className="h-9 w-44" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="p-1 hover:bg-accent rounded transition-colors"
          aria-label="Back to settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold flex-1">Financial Statement (PDF)</h1>
      </div>

      <section className="rounded-xl glass-card p-4 sm:p-6">
        <p className="text-xs text-muted-foreground mb-4">
          Generate a PDF financial statement for your tax advisor or accountant. Choose period, accounts, categories, and other options.
        </p>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                From
              </label>
              <Popover open={fromPopoverOpen} onOpenChange={setFromPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="glass"
                    className="w-full justify-start text-left font-normal"
                  >
                    <IconCalendar className="h-4 w-4" />
                    {formatDateLabel(fromDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden rounded-md p-0" align="start">
                  <Calendar
                    className="rounded-md"
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      if (date) {
                        setFromDate(date);
                        if (date > toDate) setToDate(date > today ? today : date);
                      }
                      setFromPopoverOpen(false);
                    }}
                    disabled={(date) => date > today}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                To
              </label>
              <Popover open={toPopoverOpen} onOpenChange={setToPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="glass"
                    className="w-full justify-start text-left font-normal"
                  >
                    <IconCalendar className="h-4 w-4" />
                    {formatDateLabel(toDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden rounded-md p-0" align="start">
                  <Calendar
                    className="rounded-md"
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      if (date) setToDate(date);
                      setToPopoverOpen(false);
                    }}
                    disabled={(date) => date < fromDate || date > today}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="rounded-md glass-tile p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Accounts</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllAccounts}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  onClick={deselectAllAccounts}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  None
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Only selected accounts in the statement. If none selected, all are included.
            </p>
            {dataLoaded && accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No accounts available.</p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {accounts.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedAccountIds.has(a.id)}
                      onCheckedChange={() => toggleAccount(a.id)}
                    />
                    <span className="text-sm">{a.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md glass-tile p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Categories</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllCategories}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  onClick={deselectAllCategories}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  None
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Only transactions from selected categories. If none selected, all are included.
            </p>
            {dataLoaded && categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">No categories available.</p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-2 max-h-32 overflow-y-auto">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedCategoryIds.has(c.id)}
                      onCheckedChange={() => toggleCategory(c.id)}
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md glass-tile p-3 space-y-3">
            <span className="text-sm font-medium block">Options</span>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={includePending}
                onCheckedChange={(checked) => setIncludePending(checked === true)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Include pending transactions</span>
                <span className="block text-xs text-muted-foreground">
                  Include transactions that have not been booked yet.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={includePersonalInfo}
                onCheckedChange={(checked) => setIncludePersonalInfo(checked === true)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Personal info (name, email)</span>
                <span className="block text-xs text-muted-foreground">
                  Recommended for tax advisor or accountant.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={includeTransactionList}
                onCheckedChange={(checked) => setIncludeTransactionList(checked === true)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Transaction list</span>
                <span className="block text-xs text-muted-foreground">
                  Detailed list of all transactions in the PDF.
                </span>
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
              <p className="text-xs text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IconFileExport className="h-4 w-4" />
              {loading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
