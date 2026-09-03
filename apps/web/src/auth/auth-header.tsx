"use client";

import { FilikaBrand } from "@/components/filika-brand";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function AuthHeader() {
  return (
    <header className="auth-header">
      <FilikaBrand href="/login" label="Filika home" />
      <ThemeSwitcher className="auth-theme" />
    </header>
  );
}
