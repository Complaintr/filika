"use client";

import { useEffect } from "react";
import { applyPreferences, readPreferences } from "./preferences";

export function AppearanceSync() {
  useEffect(() => {
    const sync = () => applyPreferences(readPreferences());
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("filika:preferences", sync);
    system.addEventListener("change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("filika:preferences", sync);
      system.removeEventListener("change", sync);
    };
  }, []);
  return null;
}
