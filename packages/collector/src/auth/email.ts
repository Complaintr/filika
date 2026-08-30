export interface AuthEmailConfig {
  resendApiKey?: string | undefined;
  emailFrom?: string | undefined;
}

export interface AuthEmail {
  to: string;
  url: string;
  kind: "verify" | "reset";
}

type EmailFetch = (input: string, init: RequestInit) => Promise<Response>;

/** Sends only the recipient and the authentication link; never logs either. */
export function createAuthMailer(config: AuthEmailConfig, send: EmailFetch = fetch) {
  return async ({ to, url, kind }: AuthEmail): Promise<void> => {
    if (!config.resendApiKey || !config.emailFrom)
      throw new Error("Authentication email is not configured.");
    const subject = kind === "verify" ? "Verify your Filika email" : "Reset your Filika password";
    const introduction =
      kind === "verify"
        ? "Confirm your email address to finish creating your Filika account."
        : "Use this link to choose a new password for your Filika account.";
    const expiry =
      kind === "verify"
        ? "This link expires in one hour."
        : "This link expires in 30 minutes and can only be used once.";
    try {
      const response = await send("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.emailFrom,
          to: [to],
          subject,
          text: `${introduction}\n\n${url}\n\n${expiry}\nIf you did not request this email, you can ignore it.\n\nFilika`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      await response.body?.cancel();
      if (!response.ok) throw new Error("Email delivery failed.");
    } catch {
      // Provider errors can contain recipient addresses or request details.
      throw new Error("Authentication email could not be delivered.");
    }
  };
}
