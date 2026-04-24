"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, PauseCircle, PlayCircle, RefreshCcw, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Skeleton from "@/components/ui/skeleton";
import { formatEurAmount } from "@/lib/money";

type RecurringTransaction = {
  id: string;
  originAccountId: string;
  targetAccountId: string;
  amount: string;
  notes: string;
  interval: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  category: string;
  startDate: string;
  endDate: string | null;
  nextOccurrenceAt: string;
  lastOccurrenceAt: string | null;
  active: boolean;
  createdAt: string;
};

type Account = {
  id: string;
  name: string;
  accountNumber: string;
};

type Category = {
  id: string;
  name: string;
};

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTypeColor(type: string): string {
  switch (type) {
    case "EXPENSE":
      return "text-red-500";
    case "INCOME":
      return "text-green-500";
    case "TRANSFER":
      return "text-blue-500";
    default:
      return "text-muted-foreground";
  }
}

export default function RecurringTransactionsManager() {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<RecurringTransaction | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recRes, accRes, catRes] = await Promise.all([
        fetch("/api/recurring-transaction", { credentials: "include" }),
        fetch("/api/account", { credentials: "include" }),
        fetch("/api/category", { credentials: "include" }),
      ]);
      if (!recRes.ok) throw new Error("Failed to load recurring transactions");
      const recData = await recRes.json();
      setItems((recData.recurringTransactions ?? []) as RecurringTransaction[]);
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts((accData.accounts ?? []) as Account[]);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories((catData.categories ?? []) as Category[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const accountNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.id, a.name);
    return m;
  }, [accounts]);

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  async function performDelete(item: RecurringTransaction) {
    try {
      const res = await fetch(`/api/recurring-transaction/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      throw e;
    }
  }

  async function toggleActive(item: RecurringTransaction) {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/recurring-transaction/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ active: !item.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? (data.recurringTransaction as RecurringTransaction) : it
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function runNow(item: RecurringTransaction) {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/recurring-transaction/${item.id}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to run");
      await loadAll();
      try {
        window.dispatchEvent(new CustomEvent("transaction:created"));
      } catch { }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl glass-tile p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-64" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="rounded-xl glass-tile p-4 text-red-500">Error: {error}</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl glass-tile p-8 text-center text-muted-foreground">
        <p>No recurring transactions yet.</p>
        <p className="mt-2 text-sm">
          Create one from the transactions page by selecting an interval other than
          &quot;Once&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl glass-tile p-3 text-sm text-red-500">{error}</div>
      ) : null}
      {items.map((item) => {
        const title = (item.notes ?? "")
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.length > 0) ??
          categoryNameById.get(item.category) ??
          "Recurring transaction";
        const originName = accountNameById.get(item.originAccountId) ?? "Unknown";
        const targetName = accountNameById.get(item.targetAccountId) ?? "Unknown";
        const categoryName = categoryNameById.get(item.category) ?? "—";

        return (
          <div key={item.id} className="relative rounded-xl glass-tile p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{title}</span>
                  <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {item.interval}
                  </span>
                  {item.active ? (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                      Paused
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className={`font-semibold ${getTypeColor(item.type)}`}>
                    EUR {formatEurAmount(item.amount)}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="truncate">
                    {originName}
                    {item.type === "TRANSFER" ? (
                      <>
                        {" "}
                        <ArrowRight className="inline h-3 w-3 align-middle text-muted-foreground" />{" "}
                        {targetName}
                      </>
                    ) : null}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span>{categoryName}</span>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>
                    <span className="font-medium">Starts:</span> {formatDate(item.startDate)}
                  </span>
                  <span>
                    <span className="font-medium">Next:</span> {formatDate(item.nextOccurrenceAt)}
                  </span>
                  <span>
                    <span className="font-medium">Ends:</span> {formatDate(item.endDate)}
                  </span>
                </div>
                {item.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {item.notes}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => runNow(item)}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  aria-label="Run due occurrences now"
                  title="Run due occurrences now"
                  disabled={busyId === item.id}
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(item)}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  aria-label={item.active ? "Pause" : "Resume"}
                  title={item.active ? "Pause" : "Resume"}
                  disabled={busyId === item.id}
                >
                  {item.active ? (
                    <PauseCircle className="h-4 w-4" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(item)}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                  aria-label="Delete recurring transaction"
                  title="Delete"
                  disabled={busyId === item.id}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete recurring transaction"
        description="This stops future materializations. Already created transactions will remain untouched."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={async () => {
          if (deleteConfirm) await performDelete(deleteConfirm);
        }}
      />
    </div>
  );
}
