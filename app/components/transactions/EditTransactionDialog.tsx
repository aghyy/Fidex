"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CalendarIcon, Check, FileImage, FileText, Pencil } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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

function SafeDialogSelect({
  value,
  onValueChange,
  placeholder,
  children,
  id,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          document.body.dataset.radixSelectOpen = "true";
        }
      }}
    >
      <SelectTrigger id={id} className="focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function FormContent({
  transaction,
  accounts,
  categories,
  onUpdated,
}: EditTransactionDialogProps) {
  const { setIsOpen, isOpen } = useMorphingDialog();
  const baseOccurredAt = transaction.occurredAt || transaction.createdAt;

  const parseDateValue = (value?: string) => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const formatLocalTime = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const hasExplicitTime = (value?: string) => {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    // Treat legacy noon default and current midnight default as "no explicit time".
    const isImplicitDefault =
      (d.getHours() === 12 && d.getMinutes() === 0) ||
      (d.getHours() === 0 && d.getMinutes() === 0);
    return !isImplicitDefault;
  };

  function combineDateAndOptionalTime(baseDate: Date, timeValue: string, include: boolean) {
    const combined = new Date(baseDate);
    if (!include || !timeValue) {
      combined.setHours(0, 0, 0, 0);
      return combined;
    }
    const [hours, minutes] = timeValue.split(":").map((part) => Number(part));
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      combined.setHours(hours, minutes, 0, 0);
    } else {
      combined.setHours(0, 0, 0, 0);
    }
    return combined;
  }

  const [originAccountId, setOriginAccountId] = useState(transaction.originAccountId);
  const [targetAccountId, setTargetAccountId] = useState(transaction.targetAccountId);
  const [amountInput, setAmountInput] = useState(String(transaction.amount ?? ""));
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [interval, setInterval] = useState<TransactionInterval>(transaction.interval as TransactionInterval);
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [category, setCategory] = useState(transaction.category);
  const [transactionDate, setTransactionDate] = useState<Date>(parseDateValue(baseOccurredAt));
  const [includeTime, setIncludeTime] = useState(hasExplicitTime(baseOccurredAt));
  const [transactionTime, setTransactionTime] = useState(formatLocalTime(baseOccurredAt));
  const [pending, setPending] = useState(Boolean(transaction.pending));
  const [expiresDate, setExpiresDate] = useState<Date | undefined>(
    transaction.expires ? parseDateValue(transaction.expires) : undefined
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isExpiresPopoverOpen, setIsExpiresPopoverOpen] = useState(false);
  const [isTransactionDatePopoverOpen, setIsTransactionDatePopoverOpen] = useState(false);
  const isTransfer = type === "TRANSFER";
  const amount = Number(amountInput.replace(",", "."));
  const normalizedAmount = Number.isFinite(amount) ? amount : 0;
  const tomorrowStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
  })();

  const formatDateLabel = (date?: Date) =>
    date
      ? date.toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Pick expiration date";
  const formatTransactionDateLabel = (date: Date) =>
    date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  useEffect(() => {
    if (!isOpen) return;
    setOriginAccountId(transaction.originAccountId);
    setTargetAccountId(transaction.targetAccountId);
    setAmountInput(String(transaction.amount ?? ""));
    setNotes(transaction.notes ?? "");
    setInterval(transaction.interval as TransactionInterval);
    setType(transaction.type);
    setCategory(transaction.category);
    const nextOccurredAt = transaction.occurredAt || transaction.createdAt;
    setTransactionDate(parseDateValue(nextOccurredAt));
    setIncludeTime(hasExplicitTime(nextOccurredAt));
    setTransactionTime(formatLocalTime(nextOccurredAt));
    setPending(Boolean(transaction.pending));
    setExpiresDate(transaction.expires ? parseDateValue(transaction.expires) : undefined);
    setIsTransactionDatePopoverOpen(false);
    setIsExpiresPopoverOpen(false);
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
    if (!originAccountId || !category || normalizedAmount <= 0) {
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
          amount: normalizedAmount,
          notes,
          interval,
          type,
          category,
          occurredAt: combineDateAndOptionalTime(transactionDate, transactionTime, includeTime).toISOString(),
          pending,
          expires: expiresDate ? expiresDate.toISOString() : undefined,
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
    <form onSubmit={handleSave} className="mt-4">
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1 no-scrollbar">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-amount-${transaction.id}`}>
              Amount
            </label>
            <div className="relative">
              <Input
                id={`edit-transaction-amount-${transaction.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amountInput}
                onChange={(e) => {
                  const next = e.target.value.replace(",", ".");
                  if (/^\d*\.?\d{0,2}$/.test(next)) {
                    setAmountInput(next);
                  }
                }}
                placeholder="0.00"
                className="pr-12 text-base font-medium tabular-nums focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                EUR
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Type</label>
            <SafeDialogSelect
              value={type}
              onValueChange={(value) => {
                const nextType = value as TransactionType;
                setType(nextType);
                if (nextType !== "TRANSFER") setTargetAccountId("");
              }}
              placeholder="Select type"
            >
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
            </SafeDialogSelect>
          </div>

          {isTransfer ? (
            <div className="grid gap-4 md:grid-cols-2 lg:col-span-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">From Account</label>
                <SafeDialogSelect value={originAccountId} onValueChange={setOriginAccountId} placeholder="Select account">
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountNumber})
                    </SelectItem>
                  ))}
                </SafeDialogSelect>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">To Account</label>
                <SafeDialogSelect value={targetAccountId} onValueChange={setTargetAccountId} placeholder="Select account">
                  {accounts
                    .filter((acc) => acc.id !== originAccountId)
                    .map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountNumber})
                      </SelectItem>
                    ))}
                </SafeDialogSelect>
              </div>
            </div>
          ) : (
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm text-muted-foreground">Account</label>
              <SafeDialogSelect value={originAccountId} onValueChange={setOriginAccountId} placeholder="Select account">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountNumber})
                  </SelectItem>
                ))}
              </SafeDialogSelect>
            </div>
          )}

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-category-${transaction.id}`}>
              Category
            </label>
            <SafeDialogSelect
              value={category}
              onValueChange={setCategory}
              placeholder="Select category"
              id={`edit-transaction-category-${transaction.id}`}
            >
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SafeDialogSelect>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm text-muted-foreground">Booking</label>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2">
              <Checkbox
                checked={pending}
                onCheckedChange={(checked) => setPending(checked === true)}
                className="focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0"
              />
              <span className="text-sm font-medium">Mark as pending</span>
            </label>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm text-muted-foreground">Transaction date & time</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Popover
                open={isTransactionDatePopoverOpen}
                onOpenChange={(open) => {
                  setIsTransactionDatePopoverOpen(open);
                  if (open) {
                    document.body.dataset.radixSelectOpen = "true";
                  } else {
                    delete document.body.dataset.radixSelectOpen;
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-start text-left font-normal focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {formatTransactionDateLabel(transactionDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    className="rounded-md"
                    mode="single"
                    selected={transactionDate}
                    onSelect={(date) => {
                      if (date) setTransactionDate(date);
                      setIsTransactionDatePopoverOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="flex h-10 items-center gap-3 rounded-md border px-3 py-2">
                <Checkbox
                  id={`edit-transaction-include-time-${transaction.id}`}
                  checked={includeTime}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setIncludeTime(isChecked);
                    if (!isChecked) setTransactionTime("");
                  }}
                  className="focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0"
                />
                <label
                  htmlFor={`edit-transaction-include-time-${transaction.id}`}
                  className="text-sm text-muted-foreground whitespace-nowrap"
                >
                  Time
                </label>
                <Input
                  type="time"
                  step={60}
                  value={transactionTime}
                  onChange={(e) => setTransactionTime(e.target.value)}
                  disabled={!includeTime}
                  className="ml-auto w-[130px] border-none focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0"
                />
              </div>
            </div>
          </div>

          <div className={cn("space-y-2", interval === "ONCE" && "lg:col-span-2")}>
            <label className="text-sm text-muted-foreground">Interval</label>
            <SafeDialogSelect
              value={interval}
              onValueChange={(value) => {
                const nextValue = value as TransactionInterval;
                setInterval(nextValue);
                if (nextValue === "ONCE") setExpiresDate(undefined);
              }}
              placeholder="Select interval"
            >
              <SelectItem value="ONCE">Once</SelectItem>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SafeDialogSelect>
          </div>

          {interval !== "ONCE" ? (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Expires</label>
              <Popover
                open={isExpiresPopoverOpen}
                onOpenChange={(open) => {
                  setIsExpiresPopoverOpen(open);
                  if (open) {
                    document.body.dataset.radixSelectOpen = "true";
                  } else {
                    delete document.body.dataset.radixSelectOpen;
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0",
                      !expiresDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {formatDateLabel(expiresDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    className="rounded-md"
                    mode="single"
                    captionLayout="dropdown"
                    selected={expiresDate}
                    disabled={(date) => date < tomorrowStart}
                    onSelect={(date) => {
                      if (date && date >= tomorrowStart) {
                        setExpiresDate(date);
                      }
                      setIsExpiresPopoverOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Expires must be tomorrow or later.</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground" htmlFor={`edit-transaction-notes-${transaction.id}`}>
            Notes
          </label>
          <textarea
            id={`edit-transaction-notes-${transaction.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0"
            placeholder="Optional notes..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Linked documents</label>
          <div className="rounded-xl border bg-muted/20 p-3">
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No uploaded documents yet.</p>
            ) : (
              <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                {documents.map((doc) => {
                  const selected = selectedDocumentIds.includes(doc.id);
                  const isImage = doc.mimeType.startsWith("image/");
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedDocumentIds((prev) =>
                          selected ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
                        );
                      }}
                      className={cn(
                        "group relative flex flex-col items-center gap-2 rounded-lg border bg-background p-3 text-center transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0",
                        selected && "border-primary bg-primary/5"
                      )}
                      title={`${doc.title} (${doc.kind})`}
                    >
                      {isImage ? (
                        <FileImage className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
                      )}
                      <span className="line-clamp-2 w-full text-xs font-medium">{doc.title}</span>
                      <span className="text-[11px] text-muted-foreground">{doc.kind}</span>
                      {selected ? (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-primary p-0.5 text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">Currently only EUR is available.</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="focus-visible:outline-none focus-visible:ring-0 focus:outline-none ring-0"
            disabled={saving || !originAccountId || (isTransfer && !targetAccountId) || !category || normalizedAmount <= 0}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
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
          className="w-full max-w-2xl rounded-2xl border bg-background p-5 shadow-xl"
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
