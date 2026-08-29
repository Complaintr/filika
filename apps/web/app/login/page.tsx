"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function signInWithGoogle() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: "/dashboard" }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? "Google sign-in is not configured on this server.");
        setSubmitting(false);
        return;
      }

      const body = (await response.json()) as { url?: string } | null;
      if (body?.url) {
        window.location.assign(body.url);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Could not reach the sign-in service. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="panel login-card">
        <div className="login-brand" aria-hidden="true">
          <span className="brand-mark">
            <span className="sail-main" />
            <span className="sail-small" />
            <span className="sail-hull" />
          </span>
        </div>
        <h1>Sign in to Filika</h1>
        <p className="muted">Your workspace for reviewing product feedback.</p>
        <button
          className="button button-primary button-google"
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={submitting}
        >
          <GoogleIcon />
          {submitting ? "Redirecting to Google…" : "Continue with Google"}
        </button>
        {error ? (
          <p className="login-error small" role="alert">
            {error}
          </p>
        ) : null}
        <p className="muted small login-note">
          A Google account is all you need. Your workspace opens after the first sign-in.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.59 1.79l3.44-3.44A11.98 11.98 0 0 0 1.27 6.61l4.01 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}
