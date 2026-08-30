export const ONBOARDING_ROLES = [
  "Founder",
  "Product designer",
  "Developer",
  "Customer support",
  "Other",
] as const;
export const ONBOARDING_FOCUS = [
  "all",
  "bug",
  "blocked_task",
  "confusing_behavior",
  "idea",
] as const;
export type OnboardingRole = (typeof ONBOARDING_ROLES)[number];
export type OnboardingFocus = (typeof ONBOARDING_FOCUS)[number];
export interface OnboardingPreferences {
  role: OnboardingRole;
  focus: OnboardingFocus;
  workspaceName: string;
}
const key = (userId: string) => `filika-onboarding-v1:${userId}`;

export function readOnboarding(userId: string): OnboardingPreferences | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? "null");
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    const value = raw as Record<string, unknown>;
    const role = ONBOARDING_ROLES.find((item) => item === value.role);
    const focus = ONBOARDING_FOCUS.find((item) => item === value.focus);
    if (
      !role ||
      !focus ||
      typeof value.workspaceName !== "string" ||
      !value.workspaceName.trim() ||
      value.workspaceName.length > 60
    )
      return null;
    return { role, focus, workspaceName: value.workspaceName };
  } catch {
    return null;
  }
}

export function saveOnboarding(userId: string, preferences: OnboardingPreferences): boolean {
  try {
    localStorage.setItem(key(userId), JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
