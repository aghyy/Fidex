"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Calendar, ArrowRight, FileImage, FileText, ExternalLink } from "lucide-react";
import EditTransactionDialog from "@/components/transactions/EditTransactionDialog";
import {
  MorphingDialog,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogTitle,
  MorphingDialogTrigger,
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";

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

type LinkedDocument = {
  id: string;
  title: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  url: string | null;
};

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

function formatDateTime(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TransactionDetailsDialog({
  transaction,
  accounts,
  categories,
}: {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
}) {
  const { isOpen } = useMorphingDialog();
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const originAccountName = accounts.find((a) => a.id === transaction.originAccountId)?.name ?? "Unknown account";
  const targetAccountName = accounts.find((a) => a.id === transaction.targetAccountId)?.name ?? "Unknown account";
  const categoryName = categories.find((c) => c.id === transaction.category)?.name ?? "Unknown category";
  const transactionTitle =
    (transaction.notes ?? "")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? categoryName;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingDocuments(true);
    setDocumentsError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/transaction/${transaction.id}/documents`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch linked documents");
        if (!cancelled) {
          setLinkedDocuments((data.documents ?? []) as LinkedDocument[]);
        }
      } catch (err) {
        if (!cancelled) {
          setLinkedDocuments([]);
          setDocumentsError(err instanceof Error ? err.message : "Failed to fetch linked documents");
        }
      } finally {
        if (!cancelled) setLoadingDocuments(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, transaction.id]);

  return (
    <>
      <MorphingDialogTrigger
        className="absolute inset-0 z-10 rounded-xl"
        aria-label={`View transaction ${transactionTitle}`}
      >
        <span className="sr-only">Open transaction details</span>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className="w-full max-w-2xl rounded-2xl border bg-background p-5 shadow-xl" style={{ overflow: "visible" }}>
          <MorphingDialogTitle className="text-xl">Transaction Details</MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">
            Read-only transaction information.
          </MorphingDialogDescription>

          <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1 no-scrollbar">
            <div className="rounded-lg border p-3">
              <p className="text-base font-semibold">{transactionTitle}</p>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className={transaction.type === "EXPENSE" ? "text-red-500" : transaction.type === "INCOME" ? "text-green-500" : "text-blue-500"}>
                    EUR {Number(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Type:</span> {transaction.type}
                </p>
                <p>
                  <span className="text-muted-foreground">Category:</span> {categoryName}
                </p>
                <p>
                  <span className="text-muted-foreground">Pending:</span> {transaction.pending ? "Yes" : "No"}
                </p>
                <p>
                  <span className="text-muted-foreground">Interval:</span> {transaction.interval}
                </p>
                <p>
                  <span className="text-muted-foreground">Occurred:</span> {formatDateTime(transaction.occurredAt || transaction.createdAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Created:</span> {formatDateTime(transaction.createdAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Expires:</span> {formatDateTime(transaction.expires)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Accounts</p>
              <p className="mt-1">
                {originAccountName}
                {transaction.type === "TRANSFER" ? ` -> ${targetAccountName}` : ""}
              </p>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap">{transaction.notes?.trim() ? transaction.notes : "-"}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Linked documents</p>
              {loadingDocuments ? (
                <p className="mt-2 text-sm text-muted-foreground">Loading linked documents...</p>
              ) : documentsError ? (
                <p className="mt-2 text-sm text-red-500">{documentsError}</p>
              ) : linkedDocuments.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No linked documents.</p>
              ) : (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {linkedDocuments.map((doc) => {
                    const isImage = doc.mimeType?.startsWith("image/");
                    return (
                      <a
                        key={doc.id}
                        href={doc.url ?? `/documents/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent/40"
                      >
                        {isImage ? (
                          <FileImage className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{doc.title || doc.originalFileName || "Untitled document"}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </>
  );
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
        <MorphingDialog key={transaction.id}>
          <div className="relative rounded-xl border bg-background p-4 transition-colors hover:bg-accent/50">
            <TransactionDetailsDialog transaction={transaction} accounts={accounts} categories={categories} />

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
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
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
                  <p className="mt-2 text-sm text-muted-foreground">{transaction.notes}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(transaction.occurredAt || transaction.createdAt)}
                </p>
              </div>
              <div className="relative z-20 ml-4 flex items-center gap-1">
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
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                  aria-label="Delete transaction"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </MorphingDialog>
      ))}
    </div>
  );
}
