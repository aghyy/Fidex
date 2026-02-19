"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";
import { TransactionInterval, TransactionType } from "@/types/transactions";
import { DocumentItem } from "@/types/documents";

type Transaction = {
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

type EditTransactionDialogProps = {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  onUpdated: (updated: Transaction) => void;
};

function FormContent({
  transaction,
  accounts,
  categories,
  onUpdated,
}: EditTransactionDialogProps) {
  const formatLocalDate = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const formatLocalTime = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };
  const combineLocalDateTime = (dateValue: string, timeValue: string, include: boolean) => {
    const [yy, mm, dd] = dateValue.split("-").map(Number);
    const result = new Date(yy, (mm || 1) - 1, dd || 1, 12, 0, 0, 0);
    if (include && timeValue) {
      const [h, m] = timeValue.split(":").map(Number);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        result.setHours(h, m, 0, 0);
      }
    }
    return result;
  };

  const { setIsOpen, isOpen } = useMorphingDialog();
  const [originAccountId, setOriginAccountId] = useState(transaction.originAccountId);
  const [targetAccountId, setTargetAccountId] = useState(transaction.targetAccountId);
  const [amount, setAmount] = useState<number>(Number(transaction.amount));
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [interval, setInterval] = useState<TransactionInterval>(transaction.interval as TransactionInterval);
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [category, setCategory] = useState(transaction.category);
  const [occurredDate, setOccurredDate] = useState(formatLocalDate(transaction.occurredAt || transaction.createdAt));
  const [includeTime, setIncludeTime] = useState(Boolean(formatLocalTime(transaction.occurredAt)));
  const [occurredTime, setOccurredTime] = useState(formatLocalTime(transaction.occurredAt));
  const [pending, setPending] = useState(Boolean(transaction.pending));
  const [expires, setExpires] = useState(
    transaction.expires ? new Date(transaction.expires).toISOString().slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const isTransfer = type === "TRANSFER";

  useEffect(() => {
    if (!isOpen) return;
    setOriginAccountId(transaction.originAccountId);
    setTargetAccountId(transaction.targetAccountId);
    setAmount(Number(transaction.amount));
    setNotes(transaction.notes ?? "");
    setInterval(transaction.interval as TransactionInterval);
    setType(transaction.type);
    setCategory(transaction.category);
    setOccurredDate(formatLocalDate(transaction.occurredAt || transaction.createdAt));
    setIncludeTime(Boolean(formatLocalTime(transaction.occurredAt)));
    setOccurredTime(formatLocalTime(transaction.occurredAt));
    setPending(Boolean(transaction.pending));
    setExpires(transaction.expires ? new Date(transaction.expires).toISOString().slice(0, 10) : "");
    setError(null);

    void (async () => {
      try {
        const [docsRes, linkedRes] = await Promise.all([
          fetch("/api/document", { credentials: "include" }),
          fetch(`/api/transaction/${transaction.id}/documents`, { credentials: "include" }),
        ]);
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments((docsData.documents ?? []) as DocumentItem[]);
        } else {
          setDocuments([]);
        }
        if (linkedRes.ok) {
          const linkedData = await linkedRes.json();
          setSelectedDocumentIds((linkedData.documentIds ?? []) as string[]);
        } else {
          setSelectedDocumentIds([]);
        }
      } catch {
        setDocuments([]);
        setSelectedDocumentIds([]);
      }
    })();
  }, [isOpen, transaction]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!originAccountId || !category || amount <= 0) {
      setError("Please fill all required fields");
      return;
    }
    if (isTransfer && !targetAccountId) {
      setError("Target account is required for transfer");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/transaction/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          originAccountId,
          targetAccountId: isTransfer ? targetAccountId : undefined,
          amount,
          notes,
          interval,
          type,
          category,
          occurredAt: combineLocalDateTime(occurredDate, occurredTime, includeTime).toISOString(),
          pending,
          expires: expires ? new Date(expires).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update transaction");

      const linkRes = await fetch(`/api/transaction/${transaction.id}/documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentIds: selectedDocumentIds }),
      });
      const linkData = await linkRes.json().catch(() => ({}));
      if (!linkRes.ok) {
        throw new Error(linkData.error ?? "Transaction saved but document links failed");
      }

      onUpdated(data.transaction as Transaction);
      try {
        window.dispatchEvent(new CustomEvent("transaction:updated", { detail: data.transaction }));
      } catch {}
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-4 grid gap-4">
      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-type-${transaction.id}`}>
          Type
        </label>
        <select
          id={`edit-transaction-type-${transaction.id}`}
          value={type}
          onChange={(e) => {
            const nextType = e.target.value as TransactionType;
            setType(nextType);
            if (nextType !== "TRANSFER") setTargetAccountId(originAccountId);
          }}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
          <option value="TRANSFER">Transfer</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-origin-${transaction.id}`}>
          {isTransfer ? "From Account" : "Account"}
        </label>
        <select
          id={`edit-transaction-origin-${transaction.id}`}
          value={originAccountId}
          onChange={(e) => {
            const v = e.target.value;
            setOriginAccountId(v);
            if (!isTransfer) setTargetAccountId(v);
          }}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          required
        >
          <option value="" disabled>Select account</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.accountNumber})
            </option>
          ))}
        </select>
      </div>

      {isTransfer ? (
        <div>
          <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-target-${transaction.id}`}>
            To Account
          </label>
          <select
            id={`edit-transaction-target-${transaction.id}`}
            value={targetAccountId}
            onChange={(e) => setTargetAccountId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            required
          >
            <option value="" disabled>Select account</option>
            {accounts
              .filter((acc) => acc.id !== originAccountId)
              .map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.accountNumber})
                </option>
              ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-amount-${transaction.id}`}>
          Amount
        </label>
        <input
          id={`edit-transaction-amount-${transaction.id}`}
          type="number"
          step="1"
          min="0"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-category-${transaction.id}`}>
          Category
        </label>
        <select
          id={`edit-transaction-category-${transaction.id}`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          required
        >
          <option value="" disabled>Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-interval-${transaction.id}`}>
          Interval
        </label>
        <select
          id={`edit-transaction-interval-${transaction.id}`}
          value={interval}
          onChange={(e) => setInterval(e.target.value as TransactionInterval)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
        >
          <option value="ONCE">Once</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="YEARLY">Yearly</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-occurred-date-${transaction.id}`}>
          Transaction day
        </label>
        <input
          id={`edit-transaction-occurred-date-${transaction.id}`}
          type="date"
          value={occurredDate}
          onChange={(e) => setOccurredDate(e.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground">Optional time</label>
        <div className="mt-1 flex items-center gap-3 rounded-md border bg-background px-3 py-2">
          <input
            id={`edit-transaction-include-time-${transaction.id}`}
            type="checkbox"
            checked={includeTime}
            onChange={(e) => {
              const checked = e.target.checked;
              setIncludeTime(checked);
              if (!checked) setOccurredTime("");
            }}
            className="h-4 w-4 rounded border-input"
          />
          <label htmlFor={`edit-transaction-include-time-${transaction.id}`} className="text-sm text-muted-foreground">
            Set specific time
          </label>
          <input
            type="time"
            value={occurredTime}
            onChange={(e) => setOccurredTime(e.target.value)}
            disabled={!includeTime}
            className="ml-auto w-[130px] rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted-foreground">Booking</label>
        <label className="mt-1 flex items-start gap-3 rounded-md border bg-background px-3 py-2">
          <input
            type="checkbox"
            checked={pending}
            onChange={(e) => setPending(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="block text-sm font-medium">Pending transaction</span>
            <span className="block text-xs text-muted-foreground">
              Pending transactions are excluded from balances and statistics unless enabled in settings.
            </span>
          </span>
        </label>
      </div>

      {interval !== "ONCE" ? (
        <div>
          <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-expires-${transaction.id}`}>
            Expires
          </label>
          <input
            id={`edit-transaction-expires-${transaction.id}`}
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          />
        </div>
      ) : null}

      <div>
        <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-notes-${transaction.id}`}>
          Notes
        </label>
        <textarea
          id={`edit-transaction-notes-${transaction.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground">Linked documents</label>
        <div className="mt-1 max-h-36 space-y-1 overflow-auto rounded-md border bg-background p-2">
          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No uploaded documents yet.</p>
          ) : (
            documents.map((doc) => (
              <label key={doc.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDocumentIds.includes(doc.id)}
                  onChange={(e) => {
                    setSelectedDocumentIds((prev) =>
                      e.target.checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id)
                    );
                  }}
                />
                <span className="truncate">
                  {doc.title} ({doc.kind})
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-2">
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
          disabled={saving || !originAccountId || (isTransfer && !targetAccountId) || !category || amount <= 0}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </form>
  );
}

export default function EditTransactionDialog(props: EditTransactionDialogProps) {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger
        className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
        aria-label="Edit transaction"
      >
        <Pencil className="h-4 w-4" />
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent
          className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl"
          style={{ overflow: "visible" }}
        >
          <MorphingDialogTitle className="text-xl">Edit Transaction</MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">
            Update transaction details.
          </MorphingDialogDescription>
          <FormContent {...props} />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}
