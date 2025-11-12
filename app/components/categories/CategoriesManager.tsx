"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";
import Skeleton from "@/components/ui/skeleton";
import { Category, CategoryDraft } from "@/types/categories";
import { renderIconByName } from "@/utils/icons";
import { FetchState } from "@/types/api";
import { toDraft } from "@/utils/categories";
import {
  ColorSwatchPicker,
  DEFAULT_COLOR_SWATCHES,
  normalizeHexColor,
} from "@/components/ui/color-swatch-picker";

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

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<FetchState>("idle");
  const [, setError] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  async function loadCategories() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/category", { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
      const data = (await res.json()) as { categories: Category[] };
      setCategories(data.categories ?? []);
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setState("error");
    }
  }

  useEffect(() => {
    void loadCategories();
    const handler = (e: Event) => {
      const ce = e as CustomEvent<Category>;
      if (ce.detail) {
        setCategories((prev) => [...prev, ce.detail]);
      }
    };
    try {
      window.addEventListener("category:created", handler as EventListener);
    } catch {}
    return () => {
      try {
        window.removeEventListener("category:created", handler as EventListener);
      } catch {}
    };
  }, []);

  async function handleDelete(id: string) {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/category/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setCategories((prev) => prev.filter((c) => c.id !== id));
      try {
        window.dispatchEvent(new CustomEvent("category:deleted", { detail: { id } }));
      } catch {}
      setState("success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete";
      setError(message);
      setState("error");
      throw new Error(message);
    }
  }

  async function handleUpdate(id: string, updates: Partial<Pick<Category, "name" | "color" | "icon">>) {
    setError(null);
    try {
      const res = await fetch(`/api/category/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      const updated = data.category as Category;
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
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
      {state === "loading" && categories.length === 0 ? (
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
          {sortedCategories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              onDelete={() => handleDelete(category.id)}
              onSave={(updates) => handleUpdate(category.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type CategoryItemProps = {
  category: Category;
  onSave: (updates: Partial<Pick<Category, "name" | "color" | "icon">>) => Promise<void>;
  onDelete: () => Promise<void>;
};

function CategoryItem({ category, onSave, onDelete }: CategoryItemProps) {
  return (
    <MorphingDialog>
      <CategoryDialogTrigger category={category} />
      <MorphingDialogContainer>
        <CategoryDialogContent category={category} onSave={onSave} onDelete={onDelete} />
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

type CategoryDialogTriggerProps = {
  category: Category;
};

function CategoryDialogTrigger({ category }: CategoryDialogTriggerProps) {
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
            style={{ backgroundColor: category.color ?? FALLBACK_COLOR }}
          >
            {renderIconByName(category.icon, category.color)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{category.name}</div>
            <div className="truncate text-xs text-muted-foreground">Click to edit</div>
          </div>
        </div>
      </div>
    </MorphingDialogTrigger>
  );
}

type CategoryDialogContentProps = {
  category: Category;
  onSave: (updates: Partial<Pick<Category, "name" | "color" | "icon">>) => Promise<void>;
  onDelete: () => Promise<void>;
};

function CategoryDialogContent({ category, onSave, onDelete }: CategoryDialogContentProps) {
  const { isOpen, setIsOpen } = useMorphingDialog();
  const [draft, setDraft] = useState<CategoryDraft>(() => toDraft(category));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const currentColor = draft.color ?? category.color ?? FALLBACK_COLOR;
  const normalizedColor = normalizeHexColor(currentColor, FALLBACK_COLOR);

  useEffect(() => {
    if (isOpen) {
      setDraft(toDraft(category));
      setFormError(null);
    }
  }, [category, isOpen]);

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
      setFormError(error instanceof Error ? error.message : "Failed to update category");
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
      setFormError(error instanceof Error ? error.message : "Failed to delete category");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MorphingDialogContent
      className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl"
      style={{ overflow: "visible" }}
    >
      <MorphingDialogTitle className="text-xl">Edit Category</MorphingDialogTitle>
      <MorphingDialogDescription className="text-sm text-muted-foreground">
        Update name, color, icon, or delete.
      </MorphingDialogDescription>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <div>
          <label className="text-sm text-muted-foreground" htmlFor={`category-name-${category.id}`}>
            Name
          </label>
          <input
            id={`category-name-${category.id}`}
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
                {renderIconByName(icon, normalizedColor, true)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Color</span>
          <ColorSwatchPicker
            className="mt-2"
            value={currentColor}
            colors={DEFAULT_COLOR_SWATCHES}
            onChange={(hex) => setDraft((prev) => ({ ...prev, color: hex }))}
          />
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


