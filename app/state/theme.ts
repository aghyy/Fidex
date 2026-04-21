"use client";

import { atom } from "jotai";
import Color from "color";

export type ThemeMode = "light" | "dark" | "system";

export const themeAtom = atom<ThemeMode>("system");

// Accent color (user-picked). null means "use default from :root / .dark"
export const accentAtom = atom<string | null>(null);

export type AccentHsl = {
  primary: string; // "H S% L%"
  ring: string;
  accent: string;
  accentForeground: string;
  primaryForeground: string;
  chart1: string;
  chart4: string;
};

const toHslString = (c: ReturnType<typeof Color>) => {
  const [h, s, l] = c.hsl().array();
  const hh = Number.isFinite(h) ? h : 0;
  const ss = Number.isFinite(s) ? s : 0;
  const ll = Number.isFinite(l) ? l : 0;
  return `${Math.round(hh)} ${Math.round(ss)}% ${Math.round(ll)}%`;
};

// Derived: converts accent hex -> set of HSL strings for CSS variables
export const accentHslAtom = atom<AccentHsl | null>((get) => {
  const hex = get(accentAtom);
  if (!hex) return null;
  try {
    const base = Color(hex);
    const [, , l] = base.hsl().array();
    const isLight = l > 60;

    const primary = base;
    const ring = base;
    // Lighter variant for accent surface
    const accent = base.lightness(Math.min(92, l + 25));
    // Complementary hue for secondary chart
    const chart4 = base.rotate(180);

    return {
      primary: toHslString(primary),
      ring: toHslString(ring),
      accent: toHslString(accent),
      accentForeground: isLight ? "222 47% 11%" : "210 40% 98%",
      primaryForeground: isLight ? "222 47% 11%" : "210 40% 98%",
      chart1: toHslString(primary),
      chart4: toHslString(chart4),
    };
  } catch {
    return null;
  }
});

// Derived atom for whether dark class should be applied
export const isDarkAtom = atom((get) => {
  const mode = get(themeAtom);
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
});
