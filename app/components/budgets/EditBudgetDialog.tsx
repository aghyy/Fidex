"use client";

import { useState, useEffect } from "react";
import { IconCheck, IconChevronDown, IconPencil } from "@tabler/icons-react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Budget } from "@/types/budgets";
import type { Category } from "@/types/categories";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function CategoryMultiSelect({
  value,
  onChange,
  categories,
  placeholder = "Select categories",
  id,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  categories: Category[];
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  }

  const label =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? categories.find((c) => c.id === value[0])?.name ?? value[0]
        : `${value.length} categories`;

  return (
    <Popover
      open={open}
      onOpenChange={(o: boolean) => {
        setOpen(o);
        if (o) document.body.dataset.radixSelectOpen = "true";
        else delete document.body.dataset.radixSelectOpen;
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="glass"
          id={id}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{label}</span>
          <IconChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div
          className="max-h-60 overflow-y-auto p-1"
          role="listbox"
          aria-multiselectable="true"
          aria-label="Select categories"
        >
          {categories.map((cat, index) => {
            const selected = value.includes(cat.id);
            const prevSelected =
              index > 0 && value.includes(categories[index - 1]?.id ?? "");
            const nextSelected =
              index < categories.length - 1 &&
              value.includes(categories[index + 1]?.id ?? "");

            return (
              <div
                key={cat.id}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => toggle(cat.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(cat.id);
                  }
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                  !selected && "rounded-md",
                  selected && !prevSelected && !nextSelected && "rounded-md",
                  selected && !prevSelected && nextSelected && "rounded-t-md",
                  selected && prevSelected && !nextSelected && "rounded-b-md",
                  selected && "bg-accent"
                )}
              >
                <div
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-content-center rounded-sm border border-muted-foreground/40",
                    selected && "bg-primary text-primary-foreground"
                  )}
                >
                  {selected ? <IconCheck className="h-3 w-3" /> : null}
                </div>
                <span className="truncate">{cat.name}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type EditBudgetDialogProps = {
  budget: Budget;
  categories: Category[];
  onUpdated: (budget: Budget) => void;
};

function EditBudgetForm({ budget, categories, onUpdated }: EditBudgetDialogProps) {
  const { setIsOpen } = useMorphingDialog();
  const [name, setName] = useState(budget.name ?? "");
  const [targetEuros, setTargetEuros] = useState(() =>
    typeof budget.targetAmount === "number" ? String(budget.targetAmount) : ""
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(budget.categoryIds);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(budget.name ?? "");
    setTargetEuros(typeof budget.targetAmount === "number" ? String(budget.targetAmount) : "");
    setCategoryIds(budget.categoryIds);
  }, [budget.id, budget.name, budget.targetAmount, budget.categoryIds]);

  const targetEur = (() => {
    const n = parseFloat(targetEuros.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (targetEur === null || targetEur < 0) {
      setError("Enter a valid target amount.");
      return;
    }
    if (categoryIds.length === 0) {
      setError("Select at least one category.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/budget/${budget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim() || null,
          targetAmount: targetEur,
          categoryIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update budget");
      onUpdated(data.budget as Budget);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update budget");
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/budget/${budget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to delete");
      window.dispatchEvent(new CustomEvent("budget:deleted", { detail: { id: budget.id } }));
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete budget");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground" htmlFor={`edit-budget-name-${budget.id}`}>
          Name (optional)
        </label>
        <Input
          id={`edit-budget-name-${budget.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Groceries"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground" htmlFor={`edit-budget-target-${budget.id}`}>
          Target amount (€)
        </label>
        <Input
          id={`edit-budget-target-${budget.id}`}
          type="text"
          inputMode="decimal"
          value={targetEuros}
          onChange={(e) => setTargetEuros(e.target.value)}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground" htmlFor={`edit-budget-categories-${budget.id}`}>
          Categories
        </label>
        <CategoryMultiSelect
          id={`edit-budget-categories-${budget.id}`}
          value={categoryIds}
          onChange={setCategoryIds}
          categories={categories}
          placeholder="Select categories"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={saving || deleting}
          className="mr-auto"
        >
          Delete
        </Button>
        <Button type="submit" disabled={saving || targetEur === null || categoryIds.length === 0}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete budget"
        description="Are you sure you want to delete this budget? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={performDelete}
        loading={deleting}
      />
    </form>
  );
}

export default function EditBudgetDialog({ budget, categories, onUpdated }: EditBudgetDialogProps) {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger
        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Edit budget"
      >
        <IconPencil className="h-4 w-4" />
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className="w-full max-w-lg rounded-2xl glass-dialog p-5 shadow-xl">
          <MorphingDialogTitle className="text-xl">Edit budget</MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">
            Change target and categories.
          </MorphingDialogDescription>
          <EditBudgetForm budget={budget} categories={categories} onUpdated={onUpdated} />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}
