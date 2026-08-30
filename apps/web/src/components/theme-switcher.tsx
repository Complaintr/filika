"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const PREFERENCES_KEY = "filika-workspace-v1";

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

  function selectTheme(nextTheme: ThemeChoice): void {
    setTheme(nextTheme);
    saveTheme(nextTheme);
  }

  return (
    <fieldset className={className} aria-label="Appearance">
      <legend className="sr-only">Appearance</legend>
      <button
        type="button"
        role="menuitemradio"
        aria-label="Light theme"
        aria-checked={theme === "light"}
        onClick={() => selectTheme("light")}
      >
        <Sun aria-hidden="true" />
        <span className="sr-only">Light</span>
      </button>
      <button
        type="button"
        role="menuitemradio"
        aria-label="Dark theme"
        aria-checked={theme === "dark"}
        onClick={() => selectTheme("dark")}
      >
        <Moon aria-hidden="true" />
        <span className="sr-only">Dark</span>
      </button>
      <button
        type="button"
        role="menuitemradio"
        aria-label="System theme"
        aria-checked={theme === "system"}
        onClick={() => selectTheme("system")}
      >
        <Monitor aria-hidden="true" />
        <span className="sr-only">System</span>
      </button>
    </fieldset>
  );
}
