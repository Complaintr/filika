const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "The email or password is incorrect. Please try again.",
  EMAIL_NOT_VERIFIED:
    "Verify your email before signing in. Check your inbox for a verification link.",
  INVALID_TOKEN: "This link is invalid or has expired. Request a new one.",
  TOKEN_EXPIRED: "This link has expired. Request a new one.",
  PASSWORD_TOO_SHORT: "Use at least 8 characters for your password.",
  PASSWORD_TOO_LONG: "Use no more than 128 characters for your password.",
};

export async function authRequest(
  path: string,
  body: Record<string, string>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  const data: unknown = await response.json().catch(() => null);
  const record =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  if (!response.ok) {
    const code = record && typeof record.code === "string" ? record.code : "";
    throw new Error(
      response.status === 429
        ? "Too many attempts. Wait a minute and try again."
        : response.status === 503
          ? "Email delivery is not configured. Contact the service administrator."
          : (messages[code] ?? "We could not complete that request. Please try again."),
    );
  }
  if (!record)
    throw new Error("The sign-in service returned an unexpected response. Please try again.");
  return record;
}
