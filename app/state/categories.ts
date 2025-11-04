"use client";

import React from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";

export type Category = { id: string; name: string; color: string | null; icon: string | null };

export const categoriesAtom = atom<Category[]>([]);
export const categoriesLoadedAtom = atom<boolean>(false);

export const loadCategoriesAtom = atom(null, async (_get, set) => {
  try {
    const res = await fetch("/api/category", { credentials: "include" });
    const data = await res.json();
    set(categoriesAtom, (data.categories as Category[]) ?? []);
  } catch {
    set(categoriesAtom, []);
  } finally {
    set(categoriesLoadedAtom, true);
  }
});

export function useCategoriesBootstrap(enabled: boolean) {
  const load = useSetAtom(loadCategoriesAtom);
  const loaded = useAtomValue(categoriesLoadedAtom);

  React.useEffect(() => {
    if (!enabled) return;
    if (!loaded) {
      void load();
    }

    const onCreated = () => load();
    const onDeleted = () => load();
    try {
      window.addEventListener("category:created", onCreated as EventListener);
      window.addEventListener("category:deleted", onDeleted as EventListener);
    } catch {}
    return () => {
      try {
        window.removeEventListener("category:created", onCreated as EventListener);
        window.removeEventListener("category:deleted", onDeleted as EventListener);
      } catch {}
    };
  }, [enabled, loaded, load]);
}

export function useCategories() {
  return useAtomValue(categoriesAtom);
}


