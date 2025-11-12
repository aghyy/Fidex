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
import { Category } from "@/types/categories";
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

function FormContent() {
  const { setIsOpen } = useMorphingDialog();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(DEFAULT_COLORS[0]);
  const [newIcon, setNewIcon] = useState<string>("IconQuestionMark");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
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
      const created = data.category as Category;
      try {
        window.dispatchEvent(new CustomEvent("category:created", { detail: created }));
      } catch {}
      setNewName("");
      setNewIcon("IconQuestionMark");
      setNewColor(DEFAULT_COLORS[0]);
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
          placeholder="e.g. Groceries"
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Color</label>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-9 w-12 rounded border"
            aria-label="Category color"
          />
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
              {renderIconByName(icon)}
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

export default function CreateCategoryDialog() {

  return (
    <MorphingDialog>
      <MorphingDialogTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground shadow hover:opacity-90" aria-label="Add category">
        <Plus className="h-5 w-5" />
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl">
          <MorphingDialogTitle className="text-xl">Create Category</MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">Name, color, and icon.</MorphingDialogDescription>
          <FormContent />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}


