"use client";

import React, { useState } from "react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  MorphingDialogClose,
} from "@/components/motion-primitives/morphing-dialog";
import {
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";
import { Plus } from "lucide-react";
import { Account } from "@/types/accounts";
import { renderIconByName } from "@/utils/icons";
import {
  ColorSwatchPicker,
  DEFAULT_COLOR_SWATCHES,
  normalizeHexColor,
} from "@/components/ui/color-swatch-picker";
import { Currency } from "@/types/currencies";

const ICON_OPTIONS = [
  "IconBread",
  "IconBus",
  "IconMovie",
  "IconShoppingCart",
  "IconCashBanknote",
  "IconTransferIn",
  "IconTax",
  "IconQuestionMark",
];

function FormContent() {
  const { setIsOpen } = useMorphingDialog();
  const [newName, setNewName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newColor, setNewColor] = useState<string>(DEFAULT_COLOR_SWATCHES[0]);
  const [newIcon, setNewIcon] = useState<string>("IconQuestionMark");
  const [newBalance, setNewBalance] = useState<number>(0);
  const [newCurrency, setNewCurrency] = useState<Currency>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedColor = normalizeHexColor(newColor, DEFAULT_COLOR_SWATCHES[0]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newName.trim(),
          accountNumber: newAccountNumber,
          color: newColor,
          icon: newIcon || null,
          balance: newBalance,
          currency: newCurrency
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      const created = data.account as Account;
      try {
        window.dispatchEvent(new CustomEvent("account:created", { detail: created }));
      } catch { }
      setNewName("");
      setNewIcon("IconQuestionMark");
      setNewColor(DEFAULT_COLOR_SWATCHES[0]);
      // Close dialog after successful creation
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
        <label className="text-sm text-muted-foreground">Name</label>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          placeholder="e.g. Savings Account"
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Account Number</label>
        <input
          value={newAccountNumber}
          onChange={(e) => setNewAccountNumber(e.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          placeholder="e.g. 1234-5678-9012-3456"
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Balance</label>
        <input
          value={newBalance}
          onChange={(e) => setNewBalance(Number(e.target.value))}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          placeholder="e.g. 1000.00"
          type="number"
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Currency</label>
        <select
          value={newCurrency ?? ""}
          onChange={(e) => setNewCurrency(e.target.value as Currency)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
        >
          <option value="" disabled>
            Select currency
          </option>
          {(["USD", "EUR", "GBP", "CAD", "CNY", "INR", "JPY"] as Currency[]).map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Color</label>
        <ColorSwatchPicker
          className="mt-2"
          value={newColor}
          colors={DEFAULT_COLOR_SWATCHES}
          onChange={setNewColor}
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Icon</label>
        <div className="mt-2 grid grid-cols-8 gap-2">
          {ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setNewIcon(icon)}
              className={`h-10 w-10 rounded-md border flex items-center justify-center ${newIcon === icon ? "ring-2 ring-primary" : ""}`}
              title={icon}
              aria-label={icon}
            >
              {renderIconByName(icon, normalizedColor, true)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <MorphingDialogClose className="rounded-md border px-4 py-2 text-sm">Cancel</MorphingDialogClose>
        <button
          type="submit"
          disabled={submitting || !newName.trim()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
        >
          Create
        </button>
      </div>
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </form>
  );
}

export default function CreateAccountDialog() {

  return (
    <MorphingDialog>
      <MorphingDialogTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground shadow hover:opacity-90" aria-label="Add category">
        <Plus className="h-5 w-5" />
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent
          className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl"
          style={{ overflow: "visible" }}
        >
          <MorphingDialogTitle className="text-xl">Create Account</MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">Name, account number, balance, color, and icon.</MorphingDialogDescription>
          <FormContent />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}


