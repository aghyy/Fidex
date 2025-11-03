"use client";

import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { isDarkAtom, themeAtom } from "@/state/theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useAtom(themeAtom);
  const isDark = useAtomValue(isDarkAtom);

  // Hydrate mode from cookie on mount for persistence across refreshes
  useEffect(() => {
    const cookie = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("fidex-theme="));
    if (!cookie) return;
    const value = cookie.split("=")[1] as "light" | "dark" | "system" | undefined;
    if (value === "light" || value === "dark" || value === "system") {
      setMode(value);
    }
  }, [setMode]);

  // Apply class on changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

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

  return children as React.ReactElement;
}


