"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import TransactionsManager from "@/components/transactions/TransactionsManager";
import TransactionFAB from "@/components/transactions/TransactionFAB";
import { Account } from "@/types/accounts";
import { determineTextColor } from "@/utils/colors";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";
import { IconPencil } from "@tabler/icons-react";
import { ColorSwatchPicker, DEFAULT_COLOR_SWATCHES, normalizeHexColor } from "@/components/ui/color-swatch-picker";
import { IconPicker } from "@/components/ui/icon-picker";
import { ACCOUNT_ICON_OPTIONS, renderIconByName } from "@/utils/icons";
import { useAtomValue } from "jotai";
import { profileAtom } from "@/state/profile";
import PeriodFilterPopover from "@/components/filters/PeriodFilterPopover";

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
  occurredAt: string;
};

function parseAmount(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getContinuousPeriodOptionsFromFirstTransaction(firstTransactionAt: string | null) {
  const now = new Date();
  const first = firstTransactionAt ? new Date(firstTransactionAt) : new Date(now);
  const firstDate = Number.isNaN(first.getTime()) ? new Date(now) : first;
  if (firstDate.getTime() > now.getTime()) {
    firstDate.setTime(now.getTime());
  }

  const startYear = firstDate.getFullYear();
  const startMonth = firstDate.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const years: string[] = [];
  const monthsByYear: Record<string, string[]> = {};

  for (let year = currentYear; year >= startYear; year -= 1) {
    years.push(String(year));
    const minMonth = year === startYear ? startMonth : 1;
    const maxMonth = year === currentYear ? currentMonth : 12;
    const months: string[] = [];
    for (let month = maxMonth; month >= minMonth; month -= 1) {
      months.push(String(month).padStart(2, "0"));
    }
    monthsByYear[String(year)] = months;
  }

  return { years, monthsByYear };
}

function EditAccountForm({
  account,
  onUpdated,
}: {
  account: Account;
  onUpdated: (updated: Account) => void;
}) {
  const { setIsOpen } = useMorphingDialog();
  const [name, setName] = useState(account.name);
  const [accountNumber, setAccountNumber] = useState(account.accountNumber);
  const [balance, setBalance] = useState<number>(account.balance);
  const [color, setColor] = useState<string>(account.color ?? DEFAULT_COLOR_SWATCHES[0]);
  const [icon, setIcon] = useState<string>(account.icon ?? "IconQuestionMark");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(account.name);
    setAccountNumber(account.accountNumber);
    setBalance(account.balance);
    setColor(account.color ?? DEFAULT_COLOR_SWATCHES[0]);
    setIcon(account.icon ?? "IconQuestionMark");
    setError(null);
  }, [account]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !accountNumber.trim()) {
      setError("Name and account number are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          accountNumber: accountNumber.trim(),
          balance: Number(balance),
          color: normalizeHexColor(color, DEFAULT_COLOR_SWATCHES[0]),
          icon,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update account");
      onUpdated(data.account as Account);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-4 grid gap-4">
      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`account-name-${account.id}`}>
          Name
        </label>
        <div className="mt-1 flex items-center gap-3">
          <IconPicker
            icons={ACCOUNT_ICON_OPTIONS}
            value={icon}
            backgroundColor={normalizeHexColor(color, DEFAULT_COLOR_SWATCHES[0])}
            onChange={setIcon}
          />
          <input
            id={`account-name-${account.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border bg-background px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`account-number-${account.id}`}>
          Account Number
        </label>
        <input
          id={`account-number-${account.id}`}
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`account-balance-${account.id}`}>
          Balance
        </label>
        <input
          id={`account-balance-${account.id}`}
          type="number"
          value={balance}
          onChange={(e) => setBalance(Number(e.target.value))}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Color</label>
        <ColorSwatchPicker
          className="mt-2"
          value={color}
          colors={DEFAULT_COLOR_SWATCHES}
          onChange={setColor}
        />
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-md border px-4 py-2 text-sm"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          disabled={saving || !name.trim() || !accountNumber.trim()}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function EditAccountDialog({
  account,
  onUpdated,
}: {
  account: Account;
  onUpdated: (updated: Account) => void;
}) {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/25 text-white shadow-md backdrop-blur-md transition-colors hover:bg-white/35 dark:border-white/30 dark:bg-white/10 dark:hover:bg-white/20"
        aria-label="Edit account"
      >
        <IconPencil className="h-4 w-4" />
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl" style={{ overflow: "visible" }}>
          <MorphingDialogTitle className="text-xl">Edit Account</MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">
            Update account details.
          </MorphingDialogDescription>
          <EditAccountForm account={account} onUpdated={onUpdated} />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

export default function AccountDetailPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [account, setAccount] = useState<Account | null>(null);
  const [resolvedAccountId, setResolvedAccountId] = useState("");
  const [firstTransactionAt, setFirstTransactionAt] = useState<string | null>(null);
  const [displayedBalance, setDisplayedBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const profile = useAtomValue(profileAtom);
  const includePending = Boolean(profile?.bookAllTransactions);

  const periodOptions = useMemo(
    () => getContinuousPeriodOptionsFromFirstTransaction(firstTransactionAt),
    [firstTransactionAt]
  );
  const selectedMonthPart = selectedMonth.split("-")[1] ?? "";
  const range = useMemo(
    () => getRange(periodMode, selectedMonth, selectedYear),
    [periodMode, selectedMonth, selectedYear]
  );
  const effectiveTo = useMemo(() => {
    const current = new Date();
    return range.end.getTime() > current.getTime() ? current : range.end;
  }, [range.end]);
  const headerTextColor = determineTextColor(account?.color ?? undefined);
  const mutedHeaderTextClass = headerTextColor === "black" ? "text-black/70" : "text-white/80";

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
    async function loadGlobalFirstTransactionDate() {
      try {
        const res = await fetch(`/api/transaction?${new URLSearchParams({ includePending: "true" }).toString()}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data = await res.json();
        const txs = (data.transactions ?? []) as AccountTransaction[];
        if (txs.length === 0) {
          setFirstTransactionAt(null);
          return;
        }
        const earliest = txs.reduce((min, tx) => {
          const t = new Date(tx.occurredAt).getTime();
          return Number.isNaN(t) ? min : Math.min(min, t);
        }, Number.POSITIVE_INFINITY);
        setFirstTransactionAt(Number.isFinite(earliest) ? new Date(earliest).toISOString() : null);
      } catch {
        setFirstTransactionAt(null);
      }
    }

    void loadGlobalFirstTransactionDate();
  }, []);

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
          includePending: "false",
        });
        const pendingParams = new URLSearchParams({
          accountId: resolvedAccountId,
          to: effectiveTo.toISOString(),
          pendingOnly: "true",
        });
        const [res, pendingRes] = await Promise.all([
          fetch(`/api/transaction?${params.toString()}`, { credentials: "include" }),
          includePending
            ? fetch(`/api/transaction?${pendingParams.toString()}`, { credentials: "include" })
            : Promise.resolve(new Response(JSON.stringify({ transactions: [] }), { status: 200 })),
        ]);
        if (!res.ok || !pendingRes.ok) throw new Error("Failed to fetch transactions");
        const data = await res.json();
        const pendingData = await pendingRes.json();
        const txs = (data.transactions ?? []) as AccountTransaction[];
        const pendingTxs = (pendingData.transactions ?? []) as AccountTransaction[];

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

        let pendingAdjustment = 0;
        if (includePending) {
          for (const tx of pendingTxs) {
            const amount = parseAmount(tx.amount);
            if (tx.type === "EXPENSE" && tx.originAccountId === resolvedAccountId) {
              pendingAdjustment -= amount;
            } else if (tx.type === "INCOME" && tx.originAccountId === resolvedAccountId) {
              pendingAdjustment += amount;
            } else if (tx.type === "TRANSFER") {
              if (tx.originAccountId === resolvedAccountId) pendingAdjustment -= amount;
              if (tx.targetAccountId === resolvedAccountId) pendingAdjustment += amount;
            }
          }
        }

        setDisplayedBalance(account.balance + adjustment + pendingAdjustment);
      } catch {
        setDisplayedBalance(account.balance);
      }
    }

    void loadFilteredBalance();
  }, [account, resolvedAccountId, effectiveTo, includePending]);

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
          <div className="ml-auto flex items-center gap-2">
            <PeriodFilterPopover
              appliedMode={periodMode}
              appliedYear={selectedYear}
              appliedMonth={selectedMonth}
              years={periodOptions.years}
              monthsByYear={periodOptions.monthsByYear}
              triggerAriaLabel="Open account filters"
              onApply={({ mode, year, month }) => {
                setPeriodMode(mode);
                setSelectedYear(year);
                setSelectedMonth(month);
              }}
            />
            {account ? (
              <EditAccountDialog
                account={account}
                onUpdated={(updated) => {
                  setAccount(updated);
                  setDisplayedBalance(updated.balance);
                }}
              />
            ) : null}
          </div>
        </div>

        <div
          className="mb-6 rounded-xl border p-4"
          style={{
            backgroundColor: account?.color ?? undefined,
            color: account?.color ? headerTextColor : undefined,
          }}
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading account...</p>
          ) : account ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: account.color ?? "#e5e7eb" }}
                >
                  {renderIconByName(account.icon, account.color ?? "#e5e7eb", true)}
                </div>
                <p className="text-lg font-semibold">{account.name}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className={`text-xs ${mutedHeaderTextClass}`}>Name</p>
                <p className="font-medium">{account.name}</p>
              </div>
              <div>
                <p className={`text-xs ${mutedHeaderTextClass}`}>Account Number</p>
                <p className="font-medium">{account.accountNumber}</p>
              </div>
              <div>
                <p className={`text-xs ${mutedHeaderTextClass}`}>Balance</p>
                <p className="font-medium">EUR {(displayedBalance ?? account.balance).toLocaleString()}</p>
                <p className={`text-xs ${mutedHeaderTextClass}`}>As of {effectiveTo.toLocaleDateString()}</p>
              </div>
              <div>
                <p className={`text-xs ${mutedHeaderTextClass}`}>Currency</p>
                <p className="font-medium">EUR</p>
              </div>
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


