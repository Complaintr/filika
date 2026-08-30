export interface Preferences {
  days: 7 | 30 | 90;
  density: "comfortable" | "compact";
  theme: "light" | "dark" | "system";
}

export const DEFAULT_PREFERENCES: Preferences = {
  days: 30,
  density: "comfortable",
  theme: "light",
};
const STORAGE_KEY = "filika-workspace-v1";

export function readPreferences(): Preferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof value !== "object" || value === null) return { ...DEFAULT_PREFERENCES };
    const raw = value as Record<string, unknown>;
    return {
      days: raw.days === 7 || raw.days === 90 ? raw.days : 30,
      density: raw.density === "compact" ? "compact" : "comfortable",
      theme: raw.theme === "dark" || raw.theme === "system" ? raw.theme : "light",
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(value: Preferences): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
