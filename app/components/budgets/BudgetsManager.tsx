"use client";

import { useState, useEffect, useCallback } from "react";
import { IconTrash } from "@tabler/icons-react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";
import type { Budget } from "@/types/budgets";
import type { Category } from "@/types/categories";
import EditBudgetDialog from "./EditBudgetDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type BudgetsManagerProps = {
  from?: string;
  to?: string;
};

function formatCurrency(eur: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(eur);
}

function BudgetDetailsDialog({
  budget,
  categories,
}: {
  budget: Budget;
  categories: Category[];
}) {
  useMorphingDialog();
  const categoryNames = budget.categoryIds
    .map((id) => categories.find((c) => c.id === id)?.name ?? id)
    .filter(Boolean);
  const target = budget.targetAmount;
  const actual = budget.actualAmount;
  const percent = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  const isOver = actual > target;

  return (
    <>
      <MorphingDialogTrigger
        className="absolute inset-0 z-10 rounded-xl"
        aria-label={`View budget ${budget.name ?? "Unnamed"}`}
      >
        <span className="sr-only">Open budget details</span>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className="w-full max-w-lg rounded-2xl glass-dialog p-5 shadow-xl">
          <MorphingDialogTitle className="text-xl">
            {budget.name ?? "Unnamed budget"}
          </MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">
            Target vs actual spending for the selected period.
          </MorphingDialogDescription>

          <div className="mt-4 space-y-4">
            <div className="rounded-lg border p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Target</span>
                <span className="font-medium">{formatCurrency(budget.targetAmount)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Actual</span>
                <span className={`font-semibold ${isOver ? "text-red-500" : "text-foreground"}`}>
                  {formatCurrency(budget.actualAmount)}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOver ? "bg-red-500" : percent >= 90 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {percent.toFixed(0)}% of target
                {isOver ? " (over budget)" : ""}
              </p>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Categories</p>
              <p className="mt-1">
                {categoryNames.length > 0 ? categoryNames.join(", ") : "—"}
              </p>
            </div>
          </div>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </>
  );
}

export default function BudgetsManager({ from, to }: BudgetsManagerProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmBudget, setDeleteConfirmBudget] = useState<Budget | null>(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/budget?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch budgets");
      const data = await res.json();
      setBudgets(data.budgets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch budgets");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void fetchBudgets();
    async function loadCategories() {
      try {
        const res = await fetch("/api/category", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories ?? []);
        }
      } catch {
        // ignore
      }
    }
    loadCategories();

    const handler = () => void fetchBudgets();
    window.addEventListener("budget:created", handler);
    window.addEventListener("budget:updated", handler);
    window.addEventListener("budget:deleted", handler);
    return () => {
      window.removeEventListener("budget:created", handler);
      window.removeEventListener("budget:updated", handler);
      window.removeEventListener("budget:deleted", handler);
    };
  }, [fetchBudgets]);

  async function performDelete(budget: Budget) {
    const res = await fetch(`/api/budget/${budget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Failed to delete");
    setBudgets((prev) => prev.filter((b) => b.id !== budget.id));
    window.dispatchEvent(new CustomEvent("budget:deleted", { detail: { id: budget.id } }));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl glass-tile p-4 animate-pulse">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="mt-2 flex items-center justify-between">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
            <div className="mt-2 h-2 w-full bg-muted rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl glass-tile p-4 text-red-500">
        {error}
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="rounded-xl glass-tile p-8 text-center text-muted-foreground">
        <p>No budgets yet.</p>
        <p className="mt-2 text-sm">Create one using the + button.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {budgets.map((budget) => {
        const target = budget.targetAmount;
        const actual = budget.actualAmount;
        const percent = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
        const isOver = actual > target;
        const categoryLabels = budget.categoryIds
          .map((id) => categories.find((c) => c.id === id)?.name ?? id)
          .filter(Boolean);

        return (
          <MorphingDialog key={budget.id}>
            <div className="relative rounded-xl glass-tile glass-tile-hover p-4">
              <BudgetDetailsDialog budget={budget} categories={categories} />

              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{budget.name ?? "Unnamed budget"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-semibold text-red-500">
                      {formatCurrency(actual)}
                    </span>
                    <span>of {formatCurrency(target)}</span>
                    {categoryLabels.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">{categoryLabels.slice(0, 3).join(", ")}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? "bg-red-500" : percent >= 90 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                </div>
                <div className="relative z-20 ml-4 flex items-center gap-1 shrink-0">
                  <EditBudgetDialog
                    budget={budget}
                    categories={categories}
                    onUpdated={(updated: Budget) =>
                      setBudgets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmBudget(budget)}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                    aria-label="Delete budget"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </MorphingDialog>
        );
      })}
      <ConfirmDialog
        open={deleteConfirmBudget !== null}
        onOpenChange={(open) => !open && setDeleteConfirmBudget(null)}
        title="Delete budget"
        description="Are you sure you want to delete this budget? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={async () => {
          if (deleteConfirmBudget) await performDelete(deleteConfirmBudget);
        }}
      />
    </div>
  );
}
