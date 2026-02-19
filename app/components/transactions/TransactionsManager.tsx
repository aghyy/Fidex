"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Calendar, ArrowRight } from "lucide-react";
import EditTransactionDialog from "@/components/transactions/EditTransactionDialog";

interface Transaction {
  id: string;
  originAccountId: string;
  targetAccountId: string;
  amount: string;
  notes: string;
  interval: string;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  category: string;
  occurredAt: string;
  pending: boolean;
  createdAt: string;
  expires: string;
}

interface Account {
  id: string;
  name: string;
  accountNumber: string;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface TransactionsManagerProps {
  categoryFilter?: string;
  accountFilter?: string;
  from?: string;
  to?: string;
}

export default function TransactionsManager({
  categoryFilter,
  accountFilter,
  from,
  to,
}: TransactionsManagerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append("category", categoryFilter);
      if (accountFilter) params.append("accountId", accountFilter);
      if (from) params.append("from", from);
      if (to) params.append("to", to);

      const res = await fetch(`/api/transaction?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch transactions");

      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, accountFilter, from, to]);

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/account", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error("Error fetching accounts:", e);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/category", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error("Error fetching categories:", e);
    }
  }

  useEffect(() => {
    void fetchTransactions();
    fetchAccounts();
    fetchCategories();

    const handleCreated = () => {
      void fetchTransactions();
    };

    window.addEventListener("transaction:created", handleCreated);

    return () => {
      window.removeEventListener("transaction:created", handleCreated);
    };
  }, [fetchTransactions]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const res = await fetch(`/api/transaction/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete transaction");

      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete transaction");
    }
  }

  function getAccountName(accountId: string): string {
    const account = accounts.find((a) => a.id === accountId);
    return account ? account.name : "Unknown Account";
  }

  function getCategoryName(categoryId: string): string {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Unknown Category";
  }

  function getTransactionTitle(transaction: Transaction): string {
    const firstLine = (transaction.notes ?? "")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    return firstLine ?? getCategoryName(transaction.category);
  }

  function formatAmount(amount: string): string {
    const num = parseFloat(amount);
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
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
        return "text-gray-500";
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-background p-4 animate-pulse">
            <div className="h-5 w-40 bg-muted rounded"></div>
            <div className="h-4 w-1/2 bg-muted rounded mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-background p-4 text-red-500">
        Error: {error}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border bg-background p-8 text-center text-muted-foreground">
        <p>No transactions yet.</p>
        <p className="text-sm mt-2">Create your first transaction using the + button.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="rounded-xl border bg-background p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{getTransactionTitle(transaction)}</span>
                {transaction.pending ? (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                    Pending
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className={`font-semibold ${getTypeColor(transaction.type)}`}>
                  EUR {formatAmount(transaction.amount)}
                </span>
                <span>•</span>
                <span>
                  {getAccountName(transaction.originAccountId)}
                  {transaction.type === "TRANSFER" ? (
                    <>
                      {" "}
                      <ArrowRight className="inline h-3 w-3 align-middle text-muted-foreground" />{" "}
                      {getAccountName(transaction.targetAccountId)}
                    </>
                  ) : null}
                </span>
                <span>•</span>
                <span className="capitalize">{transaction.type.toLowerCase()}</span>
                {transaction.interval !== "ONCE" && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {transaction.interval}
                    </span>
                  </>
                )}
              </div>
              {transaction.notes && (
                <p className="text-sm text-muted-foreground mt-2">{transaction.notes}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(transaction.occurredAt || transaction.createdAt)}
              </p>
            </div>
            <div className="ml-4 flex items-center gap-1">
              <EditTransactionDialog
                transaction={transaction}
                accounts={accounts}
                categories={categories}
                onUpdated={(updated) =>
                  setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
                }
              />
              <button
                onClick={() => handleDelete(transaction.id)}
                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                aria-label="Delete transaction"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
