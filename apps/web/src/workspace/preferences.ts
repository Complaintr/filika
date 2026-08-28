export interface Preferences {
  workspaceName: string;
  days: 7 | 30 | 90;
  density: "comfortable" | "compact";
}

export const DEFAULT_PREFERENCES: Preferences = {
  workspaceName: "My workspace",
  days: 30,
  density: "comfortable",
};
const STORAGE_KEY = "filika-workspace-v1";

export function readPreferences(): Preferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof value !== "object" || value === null) return { ...DEFAULT_PREFERENCES };
    const raw = value as Record<string, unknown>;
    return {
      workspaceName:
        typeof raw.workspaceName === "string" && raw.workspaceName.trim()
          ? raw.workspaceName.trim().slice(0, 60)
          : DEFAULT_PREFERENCES.workspaceName,
      days: raw.days === 7 || raw.days === 90 ? raw.days : 30,
      density: raw.density === "compact" ? "compact" : "comfortable",
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
