"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TransactionsManager from "@/components/transactions/TransactionsManager";
import TransactionFAB from "@/components/transactions/TransactionFAB";
import { Category } from "@/types/categories";

export default function CategoryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [category, setCategory] = useState<Category | null>(null);
  const [resolvedCategoryId, setResolvedCategoryId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategory() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/category/${id}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCategory(data.category ?? null);
          setResolvedCategoryId(data.category?.id ?? id);
          return;
        }

        // Backward compatibility: old links used category name slugs.
        const listRes = await fetch("/api/category", { credentials: "include" });
        if (!listRes.ok) throw new Error("Failed to fetch category");
        const listData = await listRes.json();
        const decoded = decodeURIComponent(id).toLowerCase();
        const fallback = (listData.categories ?? []).find(
          (c: Category) => c.name.toLowerCase() === decoded
        ) as Category | undefined;
        setCategory(fallback ?? null);
        setResolvedCategoryId(fallback?.id ?? id);
      } catch {
        setCategory(null);
        setResolvedCategoryId(id);
      } finally {
        setLoading(false);
      }
    }

    void loadCategory();
  }, [id]);

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/"
            className="p-1 hover:bg-accent rounded transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">Category</h1>
        </div>

        <div className="mb-6 rounded-xl border bg-background p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading category...</p>
          ) : category ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{category.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Color</p>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full border"
                    style={{ backgroundColor: category.color ?? "#e5e7eb" }}
                  />
                  <p className="font-medium">{category.color ?? "Not set"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium">EUR (currently only supported)</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Category not found.</p>
          )}
        </div>

        <h2 className="mb-3 text-lg font-semibold">Transactions</h2>
        <TransactionsManager categoryFilter={resolvedCategoryId || id} />
      </div>
      <TransactionFAB preselectedCategory={resolvedCategoryId || id} />
    </>
  );
}


