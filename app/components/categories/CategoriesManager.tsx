"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(DEFAULT_COLORS[0]);
  const [newIcon, setNewIcon] = useState<string>("");

  const isSubmitting = state === "loading";

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
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim(), color: newColor, icon: newIcon || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setCategories((prev) => [...prev, data.category as Category]);
      setNewName("");
      setNewIcon("");
      setNewColor(DEFAULT_COLORS[0]);
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setState("error");
    }
  }

  async function handleDelete(id: string) {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/category/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setCategories((prev) => prev.filter((c) => c.id !== id));
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
      <section className="rounded-xl border bg-background p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-2">Create Category</h2>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-5 items-end">
          <div className="sm:col-span-2">
            <label className="text-sm text-muted-foreground">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              placeholder="e.g. Groceries"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Color</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-9 w-12 rounded border"
                aria-label="Category color"
              />
              <div className="flex gap-1">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: c }}
                    aria-label={`Pick ${c}`}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Icon (name)</label>
            <input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              placeholder="e.g. IconBread"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isSubmitting || !newName.trim()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
        {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
      </section>

      <section className="rounded-xl border bg-background p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-2">Your Categories</h2>
        {state === "loading" && categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="divide-y">
            {sortedCategories.map((c) => (
              <li key={c.id} className="py-3 flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: c.color ?? "#e5e7eb" }} />
                <input
                  className="flex-1 rounded-md border bg-background px-2 py-1"
                  value={c.name}
                  onChange={(e) => setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                  onBlur={(e) => e.target.value.trim() && void handleUpdate(c.id, { name: e.target.value.trim() })}
                />
                <input
                  className="w-28 rounded-md border bg-background px-2 py-1"
                  value={c.icon ?? ""}
                  placeholder="Icon name"
                  onChange={(e) => setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, icon: e.target.value } : x)))}
                  onBlur={(e) => void handleUpdate(c.id, { icon: e.target.value || null })}
                />
                <input
                  type="color"
                  className="h-8 w-10 rounded border"
                  value={c.color ?? "#e5e7eb"}
                  onChange={(e) => setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, color: e.target.value } : x)))}
                  onBlur={(e) => void handleUpdate(c.id, { color: e.target.value })}
                />
                <button
                  onClick={() => void handleDelete(c.id)}
                  className="ml-2 rounded-md border px-3 py-1 text-sm hover:bg-accent"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


