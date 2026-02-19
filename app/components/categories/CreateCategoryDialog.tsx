"use client";

import React, { useState } from "react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
} from "@/components/motion-primitives/morphing-dialog";
import {
  useMorphingDialog,
} from "@/components/motion-primitives/morphing-dialog";
import { Plus } from "lucide-react";
import { Category } from "@/types/categories";
import {
  ColorSwatchPicker,
  DEFAULT_COLOR_SWATCHES,
  normalizeHexColor,
} from "@/components/ui/color-swatch-picker";
import { IconPicker } from "@/components/ui/icon-picker";
import { CATEGORY_ICON_OPTIONS } from "@/utils/icons";

function FormContent() {
  const { setIsOpen } = useMorphingDialog();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(DEFAULT_COLOR_SWATCHES[0]);
  const [newIcon, setNewIcon] = useState<string>("IconQuestionMark");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedColor = normalizeHexColor(newColor, DEFAULT_COLOR_SWATCHES[0]);

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
        <label className="text-sm text-muted-foreground" htmlFor="new-category-name">
          Name
        </label>
        <div className="mt-1 flex items-center gap-3">
          <IconPicker
            icons={CATEGORY_ICON_OPTIONS}
            value={newIcon}
            backgroundColor={normalizedColor}
            onChange={setNewIcon}
          />
          <input
            id="new-category-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-md border bg-background px-3 py-2"
            placeholder="e.g. Groceries"
            autoComplete="off"
          />
        </div>
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
      <div className="flex justify-end gap-2 mt-2">
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
      <MorphingDialogTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/25 text-white shadow-md backdrop-blur-md transition-colors hover:bg-white/35 dark:border-white/30 dark:bg-white/10 dark:hover:bg-white/20"
        aria-label="Add category"
      >
        <Plus className="h-5 w-5" />
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent
          className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-xl"
          style={{ overflow: "visible" }}
        >
          <MorphingDialogTitle className="text-xl">Create Category</MorphingDialogTitle>
          <MorphingDialogDescription className="text-sm text-muted-foreground">Name, color, and icon.</MorphingDialogDescription>
          <FormContent />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}


