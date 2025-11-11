"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  MorphingDialogClose,
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";
import Skeleton from "@/components/ui/skeleton";
import { Account } from "@/types/accounts";
import { FetchState } from "@/types/api";
import { renderIconByName } from "@/utils/icons";

const DEFAULT_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

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

const FALLBACK_COLOR = "#e5e7eb";

type AccountDraft = {
  name: string;
  color: string | null;
  icon: string | null;
};

function toDraft(account: Account): AccountDraft {
  return {
    name: account.name,
    color: account.color ?? null,
    icon: account.icon ?? null,
  };
}

export default function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [state, setState] = useState<FetchState>("idle");
  const [, setError] = useState<string | null>(null);

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => a.name.localeCompare(b.name)),
    [accounts]
  );

  async function loadAccounts() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/account", { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
      const data = (await res.json()) as { accounts: Account[] };
      setAccounts(data.accounts ?? []);
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setState("error");
    }
  }

  useEffect(() => {
    void loadAccounts();
    const handler = (e: Event) => {
      const ce = e as CustomEvent<Account>;
      if (ce.detail) {
        setAccounts((prev) => [...prev, ce.detail]);
      }
    };
    try {
      window.addEventListener("account:created", handler as EventListener);
    } catch {}
    return () => {
      try {
        window.removeEventListener("account:created", handler as EventListener);
      } catch {}
    };
  }, []);

  async function handleDelete(id: string) {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/account/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setAccounts((prev) => prev.filter((c) => c.id !== id));
      try {
        window.dispatchEvent(new CustomEvent("account:deleted", { detail: { id } }));
      } catch {}
      setState("success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete";
      setError(message);
      setState("error");
      throw new Error(message);
    }
  }

  async function handleUpdate(
    id: string,
    updates: Partial<Pick<Account, "name" | "accountNumber" | "color" | "icon" | "balance">>
  ) {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/account/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      const updated = data.account as Account;
      setAccounts((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setState("success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update";
      setError(message);
      setState("error");
      throw new Error(message);
    }
  }

  return (
    <div className="space-y-6">
      {state === "loading" && accounts.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Skeleton className="h-8 w-10" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedAccounts.map((account) => (
            <AccountItem
              key={account.id}
              account={account}
              onDelete={() => handleDelete(account.id)}
              onSave={(updates) => handleUpdate(account.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type AccountItemProps = {
  account: Account;
  onSave: (
    updates: Partial<Pick<Account, "name" | "accountNumber" | "color" | "icon" | "balance">>
  ) => Promise<void>;
  onDelete: () => Promise<void>;
};

function AccountItem({ account, onSave, onDelete }: AccountItemProps) {
  return (
    <MorphingDialog>
      <AccountDialogTrigger account={account} />
      <MorphingDialogContainer>
        <AccountDialogContent account={account} onSave={onSave} onDelete={onDelete} />
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

type AccountDialogTriggerProps = {
  account: Account;
};

function AccountDialogTrigger({ account }: AccountDialogTriggerProps) {
  const { isOpen } = useMorphingDialog();

  return (
    <MorphingDialogTrigger
      className={`transition-opacity duration-200 ${
        isOpen ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/40">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border p-2"
            style={{ backgroundColor: account.color ?? FALLBACK_COLOR }}
          >
            {renderIconByName(account.icon, account.color)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{account.name}</div>
            <div className="truncate text-xs text-muted-foreground">Click to edit</div>
          </div>
        </div>
      </div>
    </MorphingDialogTrigger>
  );
}

type AccountDialogContentProps = {
  account: Account;
  onSave: (
    updates: Partial<Pick<Account, "name" | "accountNumber" | "color" | "icon" | "balance">>
  ) => Promise<void>;
  onDelete: () => Promise<void>;
};

function AccountDialogContent({ account, onSave, onDelete }: AccountDialogContentProps) {
  const { isOpen, setIsOpen } = useMorphingDialog();
  const [draft, setDraft] = useState<AccountDraft>(() => toDraft(account));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(toDraft(account));
      setFormError(null);
    }
  }, [account, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setFormError("Name is required");
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      await onSave({
        name: draft.name.trim(),
        color: draft.color ?? undefined,
        icon: draft.icon ?? undefined,
      });
      setIsOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to update account");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async () => {
    setFormError(null);
    setIsDeleting(true);
    try {
      await onDelete();
      setIsOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MorphingDialogContent className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl">
      <MorphingDialogClose className="text-muted-foreground hover:text-foreground" />
      <MorphingDialogTitle className="text-xl">Edit Account</MorphingDialogTitle>
      <MorphingDialogDescription className="text-sm text-muted-foreground">
        Update name, color, icon, or delete.
      </MorphingDialogDescription>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <div>
          <label className="text-sm text-muted-foreground" htmlFor={`account-name-${account.id}`}>
            Name
          </label>
          <input
            id={`account-name-${account.id}`}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Icon</span>
          <div className="mt-2 grid grid-cols-8 gap-2">
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, icon }))}
                className={`flex h-10 w-10 items-center justify-center rounded-md border ${
                  draft.icon === icon ? "ring-2 ring-primary" : ""
                }`}
                title={icon}
                aria-label={icon}
              >
                {renderIconByName(icon, draft.color ?? account.color ?? undefined)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Color</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="color"
              className="h-9 w-12 rounded border"
              value={draft.color ?? FALLBACK_COLOR}
              onChange={(e) => setDraft((prev) => ({ ...prev, color: e.target.value }))}
            />
            {DEFAULT_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, color: col }))}
                className={`h-6 w-6 rounded-full border ${draft.color === col ? "ring-2 ring-primary" : ""}`}
                style={{ backgroundColor: col }}
                aria-label={`Pick ${col}`}
                title={col}
              />
            ))}
          </div>
        </div>
        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        <div className="mt-2 flex justify-between">
          <button
            type="button"
            onClick={handleDeleteClick}
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
            disabled={isDeleting || isSaving}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
              disabled={isSaving || isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
              disabled={isSaving || isDeleting || !draft.name.trim()}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </MorphingDialogContent>
  );
}


