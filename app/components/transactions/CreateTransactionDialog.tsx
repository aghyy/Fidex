"use client";

import React, { useState, useEffect } from "react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";
import { Plus } from "lucide-react";
import { TransactionType, TransactionInterval } from "@/types/transactions";
import { Account } from "@/types/accounts";
import { Category } from "@/types/categories";

interface CreateTransactionDialogProps {
  preselectedCategory?: string;
  preselectedAccount?: string;
}

function FormContent({
  preselectedCategory,
  preselectedAccount,
}: {
  preselectedCategory?: string;
  preselectedAccount?: string;
}) {
  const { setIsOpen } = useMorphingDialog();
  const [originAccountId, setOriginAccountId] = useState<string>(preselectedAccount || "");
  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [interval, setInterval] = useState<TransactionInterval>("ONCE");
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [category, setCategory] = useState<string>(preselectedCategory || "");
  const [expires, setExpires] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const isTransfer = type === "TRANSFER";

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountsRes, categoriesRes] = await Promise.all([
          fetch("/api/account", { credentials: "include" }),
          fetch("/api/category", { credentials: "include" }),
        ]);

        if (accountsRes.ok) {
          const data = await accountsRes.json();
          setAccounts(data.accounts || []);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (!accounts.length) return;
    if (!preselectedAccount) return;
    if (accounts.some((acc) => acc.id === preselectedAccount)) return;

    const decoded = decodeURIComponent(preselectedAccount).toLowerCase();
    const match = accounts.find((acc) => acc.name.toLowerCase() === decoded);
    if (match) {
      setOriginAccountId(match.id);
    }
  }, [accounts, preselectedAccount]);

  useEffect(() => {
    if (!categories.length) return;
    if (!preselectedCategory) return;
    if (categories.some((cat) => cat.id === preselectedCategory)) return;

    const decoded = decodeURIComponent(preselectedCategory).toLowerCase();
    const match = categories.find((cat) => cat.name.toLowerCase() === decoded);
    if (match) {
      setCategory(match.id);
    }
  }, [categories, preselectedCategory]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!originAccountId || !category || amount <= 0 || (isTransfer && !targetAccountId)) {
      setError("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/transaction", {
        method: "POST",
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
          expires: expires ? new Date(expires).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      
      try {
        window.dispatchEvent(new CustomEvent("transaction:created", { detail: data.transaction }));
      } catch {}
      
      // Reset form
      setOriginAccountId(preselectedAccount || "");
      setTargetAccountId("");
      setAmount(0);
      setNotes("");
      setInterval("ONCE");
      setType("EXPENSE");
      setCategory(preselectedCategory || "");
      setExpires("");
      
      setIsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="mt-4 grid gap-4">
      <div>
        <label className="text-sm text-muted-foreground" htmlFor="transaction-type">
          Type
        </label>
        <select
          id="transaction-type"
          value={type}
          onChange={(e) => setType(e.target.value as TransactionType)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
          <option value="TRANSFER">Transfer</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-muted-foreground" htmlFor="transaction-origin-account">
          {isTransfer ? "From Account" : "Account"}
        </label>
        <select
          id="transaction-origin-account"
          value={originAccountId}
          onChange={(e) => setOriginAccountId(e.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          required
        >
          <option value="" disabled>
            Select account
          </option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.accountNumber})
            </option>
          ))}
        </select>
      </div>

      {isTransfer ? (
        <div>
          <label className="text-sm text-muted-foreground" htmlFor="transaction-target-account">
            To Account
          </label>
          <select
            id="transaction-target-account"
            value={targetAccountId}
            onChange={(e) => setTargetAccountId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            required
          >
            <option value="" disabled>
              Select account
            </option>
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
        <label className="text-sm text-muted-foreground" htmlFor="transaction-amount">
          Amount
        </label>
        <input
          id="transaction-amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground" htmlFor="transaction-category">
          Category
        </label>
        <select
          id="transaction-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          required
        >
          <option value="" disabled>
            Select category
          </option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-muted-foreground" htmlFor="transaction-interval">
          Interval
        </label>
        <select
          id="transaction-interval"
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

      {interval !== "ONCE" && (
        <div>
          <label className="text-sm text-muted-foreground" htmlFor="transaction-expires">
            Expires
          </label>
          <input
            id="transaction-expires"
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          />
        </div>
      )}

      <div>
        <label className="text-sm text-muted-foreground" htmlFor="transaction-notes">
          Notes
        </label>
        <textarea
          id="transaction-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          placeholder="Optional notes..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button
          type="submit"
          disabled={submitting || !originAccountId || (isTransfer && !targetAccountId) || !category || amount <= 0}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
        >
          Create Transaction
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Currently only EUR is available.</p>
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </form>
  );
}

export default function CreateTransactionDialog({
  preselectedCategory,
  preselectedAccount,
}: CreateTransactionDialogProps) {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger
        className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground shadow hover:opacity-90"
        aria-label="Create transaction"
      >
        <Plus className="h-5 w-5" />
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent
          className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl"
          style={{ overflow: "visible" }}
        >
          <MorphingDialogTitle className="text-xl">Create Transaction</MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">
            Add a new transaction with details.
          </MorphingDialogDescription>
          <FormContent
            preselectedCategory={preselectedCategory}
            preselectedAccount={preselectedAccount}
          />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}
