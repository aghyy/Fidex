"use client";

import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { isDarkAtom, themeAtom, accentAtom, accentHslAtom } from "@/state/theme";
import { useSession } from "next-auth/react";

const ACCENT_VARS = [
  "--primary",
  "--ring",
  "--accent",
  "--accent-foreground",
  "--primary-foreground",
  "--chart-1",
  "--chart-4",
] as const;

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useAtom(themeAtom);
  const [accent, setAccent] = useAtom(accentAtom);
  const accentHsl = useAtomValue(accentHslAtom);
  const isDark = useAtomValue(isDarkAtom);
  const { status } = useSession();

  // Hydrate mode from cookie on mount for persistence across refreshes
  useEffect(() => {
    const cookie = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("fidex-theme="));
    if (!cookie) return;
    const value = cookie.split("=")[1] as "light" | "dark" | "system" | undefined;
    if (value === "light" || value === "dark" || value === "system") {
      setMode(value);
    }
  }, [setMode]);

  // Hydrate accent from cookie on mount
  useEffect(() => {
    const cookie = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("fidex-accent="));
    if (!cookie) return;
    const raw = decodeURIComponent(cookie.split("=")[1] ?? "");
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) {
      setAccent(raw);
    }
  }, [setAccent]);

  // Apply dark class on changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Apply accent CSS variables on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (!accentHsl) {
      for (const v of ACCENT_VARS) root.style.removeProperty(v);
      return;
    }
    root.style.setProperty("--primary", accentHsl.primary);
    root.style.setProperty("--ring", accentHsl.ring);
    root.style.setProperty("--accent", accentHsl.accent);
    root.style.setProperty("--accent-foreground", accentHsl.accentForeground);
    root.style.setProperty("--primary-foreground", accentHsl.primaryForeground);
    root.style.setProperty("--chart-1", accentHsl.chart1);
    root.style.setProperty("--chart-4", accentHsl.chart4);
  }, [accentHsl]);

  // Keep system listener active when in system mode
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      document.documentElement.classList.toggle("dark", mql.matches);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mode]);

  // Initial mode from current DOM class or media query
  useEffect(() => {
    if (mode !== "system") return;
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const hasDarkClass = document.documentElement.classList.contains("dark");
    if (hasDarkClass && !prefersDark) setMode("dark");
    if (!hasDarkClass && prefersDark) setMode("system");
  }, [mode, setMode]);

  // Persist mode to cookie when it changes
  useEffect(() => {
    const oneYear = 60 * 60 * 24 * 365;
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const secure = isHttps ? "; Secure" : "";
    document.cookie = `fidex-theme=${mode}; Path=/; Max-Age=${oneYear}; SameSite=Lax${secure}`;
  }, [mode]);

  // Persist accent to cookie when it changes
  useEffect(() => {
    const oneYear = 60 * 60 * 24 * 365;
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const secure = isHttps ? "; Secure" : "";
    if (accent) {
      document.cookie = `fidex-accent=${encodeURIComponent(accent)}; Path=/; Max-Age=${oneYear}; SameSite=Lax${secure}`;
    } else {
      document.cookie = `fidex-accent=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    }
  }, [accent]);

  // Persist mode to DB for authenticated users
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ theme: mode }),
    }).catch(() => {});
  }, [mode, status]);

  // Persist accent to DB for authenticated users
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ accentColor: accent }),
    }).catch(() => {});
  }, [accent, status]);

  return children as React.ReactElement;
}
