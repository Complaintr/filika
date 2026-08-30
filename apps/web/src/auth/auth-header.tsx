"use client";

import { Moon, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readPreferences, savePreferences } from "@/workspace/preferences";

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
    savePreferences({ ...readPreferences(), theme });
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#f7f8fa" : "#0e0e10");
    setDark(!dark);
  }

  return (
    <header className="auth-header">
      <Link href="/login" className="auth-brand" aria-label="Filika home">
        <Image src="/filika-logo.svg" width={32} height={32} alt="" unoptimized />
        <span>Filika</span>
      </Link>
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
