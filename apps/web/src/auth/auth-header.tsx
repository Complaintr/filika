"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { FilikaBrand } from "@/components/filika-brand";
import { applyPreferences, readPreferences, savePreferences } from "@/workspace/preferences";

export function AuthHeader() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.dataset.theme === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  function toggleTheme() {
    const theme = dark ? "light" : "dark";
    const preferences: ReturnType<typeof readPreferences> = { ...readPreferences(), theme };
    savePreferences(preferences);
    applyPreferences(preferences);
    window.dispatchEvent(new Event("filika:preferences"));
    setDark(!dark);
  }

  return (
    <header className="auth-header">
      <FilikaBrand href="/login" label="Filika home" />
      <button
        className="auth-theme"
        type="button"
        onClick={toggleTheme}
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
