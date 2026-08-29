export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface SessionInfo {
  user: SessionUser;
}

function record(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

function shortString(raw: unknown, max: number): raw is string {
  return typeof raw === "string" && raw.length > 0 && raw.length <= max;
}

/** Reads the current Better Auth session. Returns null when signed out. */
export async function fetchSession(signal: AbortSignal): Promise<SessionInfo | null> {
  const response = await fetch("/api/auth/get-session", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("The auth service could not be reached.");
  const raw: unknown = await response.json();
  if (
    !record(raw) ||
    !record(raw.user) ||
    !shortString(raw.user.id, 200) ||
    !shortString(raw.user.name, 200) ||
    !shortString(raw.user.email, 320) ||
    !(raw.user.image === null || shortString(raw.user.image, 2048))
  )
    throw new Error("Invalid session response.");
  return {
    user: {
      id: raw.user.id,
      name: raw.user.name,
      email: raw.user.email,
      image: raw.user.image === null ? null : raw.user.image,
    },
  };
}

/** Ends the current session and redirects to the login page. */
export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch {
    // Continue even if network error occurs
  }
  if (typeof document !== "undefined") {
    // biome-ignore lint/suspicious/noDocumentCookie: Clear session cookie on sign out
    document.cookie = "better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  }
  if (typeof window !== "undefined") {
    window.location.assign("/login?force=1");
  }
}
