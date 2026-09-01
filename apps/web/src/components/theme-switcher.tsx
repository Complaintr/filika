"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const PREFERENCES_KEY = "filika-workspace-v1";

const CYCLE_ORDER: readonly ThemeChoice[] = ["light", "dark", "system"];

export function readTheme(): ThemeChoice {
  if (typeof window === "undefined") return "light";
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null");
    if (typeof value === "object" && value !== null && "theme" in value) {
      const storedTheme = (value as { theme?: unknown }).theme;
      if (storedTheme === "dark" || storedTheme === "system") return storedTheme;
      return "light";
    }
  } catch {
    return "light";
  }
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function resolveTheme(theme: ThemeChoice): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: ThemeChoice): void {
  const resolvedTheme = resolveTheme(theme);
  document.documentElement.dataset.theme = resolvedTheme;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", resolvedTheme === "dark" ? "#0e0e10" : "#f7f8fa");
}

export function saveTheme(theme: ThemeChoice): void {
  applyTheme(theme);

  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null");
    const current = typeof value === "object" && value !== null ? value : {};
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...current, theme }));
  } catch {
    // The visible theme can still change when browser storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent("filika:preferences"));
}

export interface ThemeSwitcherProps {
  className?: string | undefined;
}

/** Single toggle button that cycles light → dark → system on each click. */
export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState<ThemeChoice>("light");

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = readTheme();
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };
    const systemTheme =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener("filika:preferences", syncTheme);
    systemTheme?.addEventListener("change", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("filika:preferences", syncTheme);
      systemTheme?.removeEventListener("change", syncTheme);
    };
  }, []);

  function cycleTheme(): void {
    const currentIndex = CYCLE_ORDER.indexOf(theme);
    const next = CYCLE_ORDER[(currentIndex + 1) % CYCLE_ORDER.length] ?? "light";
    setTheme(next);
    saveTheme(next);
  }

  const label =
    theme === "light" ? "Light theme" : theme === "dark" ? "Dark theme" : "System theme";

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      data-theme-choice={theme}
      onClick={cycleTheme}
    >
      {theme === "light" && <Sun aria-hidden="true" />}
      {theme === "dark" && <Moon aria-hidden="true" />}
      {theme === "system" && <Monitor aria-hidden="true" />}
    </button>
  );
}
