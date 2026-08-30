"use client";

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AuthHeader } from "./auth-header";
import { authRequest } from "./auth-request";
import { GoogleIcon } from "./google-icon";

type Mode = "login" | "register" | "forgot-password" | "reset-password";
const copy: Record<Mode, { title: string; description: string; action: string }> = {
  login: {
    title: "Sign in to Filika",
    description: "Welcome back. Let’s get back to your feedback.",
    action: "Sign in",
  },
  register: {
    title: "Create your Filika account",
    description: "A little feedback. A better product. Start here.",
    action: "Create account",
  },
  "forgot-password": {
    title: "Forgot your password?",
    description: "It happens. We’ll send you a link to reset it.",
    action: "Send reset link",
  },
  "reset-password": {
    title: "A fresh start",
    description: "Choose a new password for your Filika account.",
    action: "Reset password",
  },
};

export function AuthExperience() {
  const pathname = usePathname();
  const mode: Mode =
    pathname === "/register"
      ? "register"
      : pathname === "/forgot-password"
        ? "forgot-password"
        : pathname === "/reset-password"
          ? "reset-password"
          : "login";
  return (
    <main id="app-content" className={`auth-page${mode === "register" ? " auth-register" : ""}`}>
      <div className="auth-card">
        <section className="auth-form-panel" aria-label="Account access">
          <AuthHeader />
          <AuthForm key={mode} mode={mode} />
          <p className="auth-legal">
            By continuing, you agree to our <Link href="/terms">Terms of Service</Link>.
          </p>
        </section>
        <div className="auth-art" aria-hidden="true">
          <Image
            className="auth-photo auth-photo-login"
            src="/auth/photo.png"
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 1600px"
            priority
          />
          <Image
            className="auth-photo auth-photo-register"
            src="/auth/photo2.png"
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 1600px"
            priority
          />
        </div>
      </div>
    </main>
  );
}

function AuthForm({ mode }: { mode: Mode }) {
  const query = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const token = query.get("token");
  const invalidReset =
    mode === "reset-password" && (!token || token.length > 512 || query.has("error"));
  const social = mode === "login" || mode === "register";
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    return () => controller.current?.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (mode === "reset-password" && password !== form.get("confirmPassword")) {
      setError("Your passwords do not match.");
      return;
    }
    const payload: Record<string, string> =
      mode === "forgot-password"
        ? { email, redirectTo: "/reset-password" }
        : mode === "reset-password"
          ? { newPassword: password, token: token ?? "" }
          : mode === "register"
            ? {
                email,
                password,
                name: String(form.get("name") ?? "").trim(),
                callbackURL: "/login?verified=1",
              }
            : { email, password, callbackURL: "/onboarding" };
    const path =
      mode === "forgot-password"
        ? "request-password-reset"
        : mode === "reset-password"
          ? "reset-password"
          : mode === "register"
            ? "sign-up/email"
            : "sign-in/email";
    await run(async (signal) => {
      await authRequest(path, payload, signal);
      if (mode === "login") window.location.assign("/onboarding");
      else setSuccess(true);
    });
  }

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (pending) return;
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setError("");
    try {
      await action(request.signal);
    } catch (cause) {
      if (!request.signal.aborted)
        setError(
          cause instanceof Error && cause.name === "Error"
            ? cause.message
            : "Could not reach the sign-in service. Please try again.",
        );
    } finally {
      if (!request.signal.aborted) setPending(false);
    }
  }

  async function google() {
    await run(async (signal) => {
      const data = await authRequest(
        "sign-in/social",
        { provider: "google", callbackURL: "/onboarding", errorCallbackURL: "/login?error=oauth" },
        signal,
      );
      if (typeof data.url !== "string" || data.url.length > 4096)
        throw new Error("Google sign-in is unavailable. Please try again later.");
      const destination = new URL(data.url);
      if (destination.protocol !== "https:" || destination.hostname !== "accounts.google.com")
        throw new Error("Google sign-in returned an unexpected address.");
      window.location.assign(destination.href);
    });
  }

  return (
    <div className="auth-form-content">
      <div className="auth-intro">
        {success && (
          <span className="auth-success-icon">
            <Check aria-hidden="true" />
          </span>
        )}
        <h1 ref={heading} tabIndex={-1}>
          {success
            ? mode === "reset-password"
              ? "Password updated"
              : "Check your inbox"
            : copy[mode].title}
        </h1>
        <p>
          {success
            ? mode === "register"
              ? "If this address is new, we’ve sent a verification link. Open it to finish creating your account. Already registered? Sign in instead."
              : mode === "forgot-password"
                ? "If an account exists for that email, you’ll receive a password reset link. Check your spam folder, too."
                : "Your new password is ready. Sign in to return to your workspace."
            : copy[mode].description}
        </p>
      </div>
      {success ? (
        <Link
          className="auth-submit auth-success-link"
          href={mode === "reset-password" ? "/login?force=1" : "/login"}
        >
          Back to sign in <ArrowRight aria-hidden="true" />
        </Link>
      ) : invalidReset ? (
        <div className="auth-message" role="alert">
          This reset link is missing, invalid, or expired.{" "}
          <Link href="/forgot-password">Request a new link</Link>.
        </div>
      ) : (
        <>
          {social && (
            <>
              <button
                className="auth-google"
                type="button"
                onClick={() => void google()}
                disabled={pending}
              >
                <GoogleIcon />
                Continue with Google
              </button>
              <div className="auth-divider">
                <span>or continue with email</span>
              </div>
            </>
          )}
          {mode === "login" && query.has("verified") && !query.has("error") && (
            <p className="auth-message" role="status">
              Email verified. You can now sign in.
            </p>
          )}
          {query.has("error") && social && (
            <p className="auth-error" role="alert">
              That sign-in or verification link could not be completed. Please try signing in again.
            </p>
          )}
          <form onSubmit={submit} className="auth-form" aria-busy={pending}>
            {mode === "register" && (
              <label htmlFor="auth-name">
                Full name
                <input
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  placeholder="Your name"
                  maxLength={200}
                  required
                  disabled={pending}
                />
              </label>
            )}
            {mode !== "reset-password" && (
              <label htmlFor="auth-email">
                Email address
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  maxLength={254}
                  required
                  disabled={pending}
                />
              </label>
            )}
            {mode !== "forgot-password" && (
              <label htmlFor="auth-password">
                <span className="auth-label-row">
                  <span>{mode === "reset-password" ? "New password" : "Password"}</span>
                  {mode === "login" && <Link href="/forgot-password">Forgot password?</Link>}
                </span>
                <span className="auth-password">
                  <input
                    aria-label={mode === "reset-password" ? "New password" : "Password"}
                    id="auth-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={pending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </span>
              </label>
            )}
            {mode === "reset-password" && (
              <label htmlFor="auth-confirm">
                Confirm new password
                <input
                  id="auth-confirm"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter your new password again"
                  minLength={8}
                  maxLength={128}
                  required
                  disabled={pending}
                />
              </label>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button className="auth-submit" type="submit" disabled={pending}>
              {pending ? "Please wait…" : copy[mode].action}
              <ArrowRight aria-hidden="true" />
            </button>
          </form>
        </>
      )}
      {!success && (
        <p className="auth-switch">
          {mode === "login" ? (
            <>
              Don’t have an account? <Link href="/register">Register</Link>
            </>
          ) : mode === "register" ? (
            <>
              Already have an account? <Link href="/login">Sign in</Link>
            </>
          ) : (
            <Link href="/login">
              <ArrowLeft aria-hidden="true" /> Back to sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
