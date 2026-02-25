"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/categories";

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
      onOpenChange={(o) => {
        setOpen(o);
        if (o) document.body.dataset.radixSelectOpen = "true";
        else delete document.body.dataset.radixSelectOpen;
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          className="w-full justify-between font-normal focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-60 overflow-y-auto p-1">
          {categories.map((cat) => {
            const selected = value.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                  selected && "bg-accent"
                )}
              >
                <Checkbox checked={selected} onCheckedChange={() => toggle(cat.id)} className="pointer-events-none" />
                <span className="truncate">{cat.name}</span>
                {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CreateBudgetForm() {
  const { setIsOpen } = useMorphingDialog();
  const [name, setName] = useState("");
  const [targetEuros, setTargetEuros] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/category", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  const targetCents = (() => {
    const n = parseFloat(targetEuros.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (targetCents === null || targetCents < 0) {
      setError("Enter a valid target amount.");
      return;
    }
    if (categoryIds.length === 0) {
      setError("Select at least one category.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim() || null,
          targetAmountCents: targetCents,
          categoryIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create budget");
      window.dispatchEvent(new CustomEvent("budget:created", { detail: data.budget }));
      setIsOpen(false);
      setName("");
      setTargetEuros("");
      setCategoryIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create budget");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground" htmlFor="budget-name">
          Name (optional)
        </label>
        <Input
          id="budget-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Groceries"
          className="focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground" htmlFor="budget-target">
          Target amount (€)
        </label>
        <Input
          id="budget-target"
          type="text"
          inputMode="decimal"
          value={targetEuros}
          onChange={(e) => setTargetEuros(e.target.value)}
          placeholder="0.00"
          className="focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground" htmlFor="budget-categories">
          Categories
        </label>
        <CategoryMultiSelect
          id="budget-categories"
          value={categoryIds}
          onChange={setCategoryIds}
          categories={categories}
          placeholder="Select categories"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="submit" disabled={submitting || targetCents === null || categoryIds.length === 0}>
          {submitting ? "Creating…" : "Create budget"}
        </Button>
      </div>
    </form>
  );
}

export default function CreateBudgetDialog() {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/25 text-white shadow-md backdrop-blur-md transition-colors hover:bg-white/35 dark:border-white/30 dark:bg-white/10 dark:hover:bg-white/20"
        aria-label="Create budget"
      >
        <Plus className="h-5 w-5" />
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl">
          <MorphingDialogTitle className="text-xl">Create budget</MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">
            Set a spending target for one or more categories.
          </MorphingDialogDescription>
          <CreateBudgetForm />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}
