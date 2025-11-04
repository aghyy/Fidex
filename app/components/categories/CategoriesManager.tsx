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
} from "@/components/motion-primitives/morphing-dialog";
import Skeleton from "@/components/ui/skeleton";
import {
  IconQuestionMark,
  IconBread,
  IconBus,
  IconMovie,
  IconShoppingCart,
  IconCashBanknote,
  IconTransferIn,
  IconTax,
} from "@tabler/icons-react";

type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

type FetchState = "idle" | "loading" | "success" | "error";

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

const iconMap: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  IconQuestionMark: (p) => <IconQuestionMark {...p} />,
  IconBread: (p) => <IconBread {...p} />,
  IconBus: (p) => <IconBus {...p} />,
  IconMovie: (p) => <IconMovie {...p} />,
  IconShoppingCart: (p) => <IconShoppingCart {...p} />,
  IconCashBanknote: (p) => <IconCashBanknote {...p} />,
  IconTransferIn: (p) => <IconTransferIn {...p} />,
  IconTax: (p) => <IconTax {...p} />,
};

function renderIconByName(name?: string | null, backgroundColor?: string | null) {
  const Comp = (name && iconMap[name]) || iconMap["IconQuestionMark"];
  return <Comp className={`h-5 w-5 text-${determineTextColor(backgroundColor)}`} />;
}

function hexToRgb(hex: string) {
  const [r, g, b] = hex.match(/[0-9A-Fa-f]{2}/g)?.map(c => parseInt(c, 16)) ?? [0, 0, 0];
  return { r, g, b };
}

function isBrightSimple(r: number, g: number, b: number): boolean {
  // Perceived brightness formula
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b; // range [0,255]
  return brightness > 128; // Midpoint threshold; adjust if needed
}

function determineTextColor(backgroundColor?: string | null) {
  if (!backgroundColor) return "white";
  const { r, g, b } = hexToRgb(backgroundColor);
  return isBrightSimple(r, g, b) ? "black" : "white";
}

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<FetchState>("idle");
  const [, setError] = useState<string | null>(null);

  // create dialog moved to page header; local create state removed

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

  // creation handled by CreateCategoryDialog in page header

  async function handleDelete(id: string) {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/category/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setCategories((prev) => prev.filter((c) => c.id !== id));
      try {
        window.dispatchEvent(new CustomEvent("category:deleted", { detail: { id } }));
      } catch {}
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setState("error");
    }
  }

  async function handleUpdate(id: string, updates: Partial<Pick<Category, "name" | "color" | "icon">>) {
    setState("loading");
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
      setError(e instanceof Error ? e.message : "Failed to update");
      setState("error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Create button moved to page header via CreateCategoryDialog */}

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
          {sortedCategories.map((c) => (
              <MorphingDialog key={c.id}>
                <MorphingDialogTrigger>
                  <div className="w-full text-left rounded-lg border p-3 hover:bg-accent/40 transition-colors relative">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 p-2 rounded-full border flex items-center justify-center" style={{ backgroundColor: c.color ?? "#e5e7eb" }}>
                        {renderIconByName(c.icon, c.color)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground truncate">Click to edit</div>
                      </div>
                    </div>
                  </div>
                </MorphingDialogTrigger>
                <MorphingDialogContainer>
                  <MorphingDialogContent className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl">
                    <MorphingDialogTitle className="text-xl">Edit Category</MorphingDialogTitle>
                    <MorphingDialogDescription className="text-sm text-muted-foreground">Update name, color, or delete.</MorphingDialogDescription>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const item = categories.find((x) => x.id === c.id);
                        if (!item) return;
                        void handleUpdate(c.id, { name: item.name, color: item.color ?? undefined, icon: item.icon ?? undefined });
                      }}
                      className="mt-4 grid gap-4"
                    >
                      <div>
                        <label className="text-sm text-muted-foreground">Name</label>
                        <input
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                          value={c.name}
                          onChange={(e) => setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Icon</label>
                        <div className="mt-2 grid grid-cols-8 gap-2">
                          {ICON_OPTIONS.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, icon } : x)))}
                              className={`h-10 w-10 rounded-md border flex items-center justify-center ${c.icon === icon ? "ring-2 ring-primary" : ""}`}
                              title={icon}
                              aria-label={icon}
                            >
                              {renderIconByName(icon)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Color</label>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <input
                            type="color"
                            className="h-9 w-12 rounded border"
                            value={c.color ?? "#e5e7eb"}
                            onChange={(e) => setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, color: e.target.value } : x)))}
                          />
                          {DEFAULT_COLORS.map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, color: col } : x)))}
                              className={`h-6 w-6 rounded-full border ${c.color === col ? "ring-2 ring-primary" : ""}`}
                              style={{ backgroundColor: col }}
                              aria-label={`Pick ${col}`}
                              title={col}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <MorphingDialogClose className="rounded-md border px-4 py-2 text-sm">Close</MorphingDialogClose>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleDelete(c.id)}
                            className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                          >
                            Delete
                          </button>
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </form>
                  </MorphingDialogContent>
                </MorphingDialogContainer>
              </MorphingDialog>
            ))}
          </div>
        )}
    </div>
  );
}


