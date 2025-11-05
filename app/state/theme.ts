"use client";

import { atom } from "jotai";

export type ThemeMode = "light" | "dark" | "system";

export const themeAtom = atom<ThemeMode>("system");

// Derived atom for whether dark class should be applied
export const isDarkAtom = atom((get) => {
  const mode = get(themeAtom);
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
});


