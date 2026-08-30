"use client";

import {
  ArrowRight,
  Bug,
  Check,
  ChevronLeft,
  CircleHelp,
  CircleSlash,
  Code2,
  Inbox,
  Lightbulb,
  MessageSquare,
  MousePointer2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthHeader } from "@/auth/auth-header";
import { applicationPath, createApplication, fetchApplications } from "@/services/applications-api";
import { fetchSession, type SessionInfo } from "@/services/session";
import {
  ONBOARDING_ROLES,
  type OnboardingFocus,
  type OnboardingRole,
  readOnboarding,
  saveOnboarding,
} from "./preferences";

const focuses = [
  { id: "all", label: "A bit of everything", hint: "Keep the whole picture in view", icon: Inbox },
  { id: "bug", label: "Find bugs", hint: "Understand what’s not working", icon: Bug },
  {
    id: "blocked_task",
    label: "Unblock people",
    hint: "See where a task comes to a stop",
    icon: CircleSlash,
  },
  {
    id: "confusing_behavior",
    label: "Clear up confusion",
    hint: "Make your product easier to use",
    icon: CircleHelp,
  },
  { id: "idea", label: "Discover ideas", hint: "Listen for the next improvement", icon: Lightbulb },
] as const;

export function OnboardingExperience() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [focus, setFocus] = useState<OnboardingFocus>("all");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [origin, setOrigin] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchSession(controller.signal)
      .then(async (value) => {
        if (controller.signal.aborted) return;
        if (!value) {
          window.location.replace("/login?force=1");
          return;
        }
        const applications = await fetchApplications(controller.signal);
        if (controller.signal.aborted) return;
        if (applications[0] && !new URLSearchParams(window.location.search).has("new")) {
          window.location.replace(applicationPath(applications[0].slug, "complaints"));
          return;
        }
        const existing = readOnboarding(value.user.id);
        setSession(value);
        setRole(existing?.role ?? null);
        setFocus(existing?.focus ?? "all");
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Your session could not be loaded. Sign in again to continue.");
          setLoading(false);
        }
      });
    return () => {
      controller.abort();
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!loading && step >= 0) heading.current?.focus({ preventScroll: true });
  }, [step, loading]);

  function continueStep() {
    if (step === 0 && !role) return;
    if (
      step === 1 &&
      (!name.trim() || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2)
    ) {
      setError(
        "Enter an application name and a URL using lowercase letters, numbers, and hyphens.",
      );
      return;
    }
    setError("");
    setStep((value) => Math.min(value + 1, 3));
  }
  async function finish() {
    if (!session || !role || saving) return;
    setSaving(true);
    setError("");
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const application = await createApplication(
        {
          displayName: name.trim(),
          slug,
          dashboardDays: 30,
          allowedOrigins: origin.trim() ? [origin.trim()] : [],
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      saveOnboarding(session.user.id, { role, focus, applicationName: application.displayName });
      window.location.assign(
        applicationPath(application.slug, "complaints") + (focus === "all" ? "" : `?kind=${focus}`),
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : "Your application could not be created.");
        setSaving(false);
      }
    }
  }

  const title = [
    "What brings you to Filika?",
    "Create your first application.",
    "What would you like to improve?",
    "A little feedback goes a long way.",
  ][step];
  const description = [
    "Choose the role that describes you best.",
    "Give your application a name and an address in Filika.",
    "We’ll open your inbox with this focus. You can change it anytime.",
    "Create your application to start collecting reviewed feedback.",
  ][step];

  return (
    <main id="app-content" className="onboarding-page">
      <aside className="onboarding-visual" aria-label="Filika product preview">
        <Image
          src="/auth/photo2.png"
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 1600px"
          priority
        />
        <div className="onboarding-visual-shade" />
        <div className="onboarding-visual-caption">
          <span>From a moment of friction</span>
          <strong>to a better product.</strong>
        </div>
        <ProductPreview step={step} applicationName={name || "Your application"} />
        <p className="onboarding-example-label">
          Illustrative preview · your actual reports will appear in your inbox
        </p>
      </aside>
      <section className="onboarding-main">
        <AuthHeader />
        <div className="onboarding-top-actions">
          <button
            className="studio-icon-button"
            type="button"
            aria-label="Previous step"
            disabled={step === 0 || loading || saving}
            onClick={() => {
              setStep((value) => Math.max(0, value - 1));
              setError("");
            }}
          >
            <ChevronLeft />
          </button>
          <Link href="/account">
            Account settings <ArrowRight />
          </Link>
        </div>
        {loading ? (
          <div className="onboarding-content" role="status">
            <p className="studio-eyebrow">Make yourself at home</p>
            <h1>Loading your account…</h1>
          </div>
        ) : !session ? (
          <div className="onboarding-content">
            <h1>Let’s get you signed in.</h1>
            <p role="alert">{error}</p>
            <Link className="studio-button studio-button-primary" href="/login?force=1">
              Back to sign in <ArrowRight />
            </Link>
          </div>
        ) : (
          <div className="onboarding-content" key={step}>
            <p className="studio-eyebrow">
              {
                [
                  "A quick introduction",
                  "A space of your own",
                  "Find your focus",
                  "You’re in good company",
                ][step]
              }
            </p>
            <h1 ref={heading} tabIndex={-1}>
              {title}
            </h1>
            <p className="onboarding-description">{description}</p>
            {step === 0 && (
              <fieldset className="onboarding-role-options">
                <legend className="sr-only">Your role</legend>
                {ONBOARDING_ROLES.map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={role === value}
                      onChange={() => {
                        setRole(value);
                        if (value === "Developer") setFocus("bug");
                        else if (value === "Customer support") setFocus("blocked_task");
                        else if (value === "Product designer") setFocus("confusing_behavior");
                        else setFocus("all");
                      }}
                    />
                    <span className="onboarding-radio">{role === value && <Check />}</span>
                    {value}
                  </label>
                ))}
              </fieldset>
            )}
            {step === 1 && (
              <div className="onboarding-name">
                <label htmlFor="onboarding-name">Application name</label>
                <input
                  className="studio-input"
                  id="onboarding-name"
                  maxLength={60}
                  value={name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setName(value);
                    if (!slugEdited)
                      setSlug(
                        value
                          .toLowerCase()
                          .normalize("NFKD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "")
                          .slice(0, 48),
                      );
                  }}
                  placeholder="Eckra"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") continueStep();
                  }}
                />
                <label htmlFor="onboarding-slug">Application URL</label>
                <input
                  className="studio-input"
                  id="onboarding-slug"
                  value={slug}
                  maxLength={48}
                  placeholder="eckra"
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(event.target.value);
                  }}
                />
                <p className="application-url-preview">/{slug || "eckra"}/complaints</p>
                <label htmlFor="onboarding-origin">Website origin (optional)</label>
                <input
                  className="studio-input"
                  id="onboarding-origin"
                  type="url"
                  placeholder="https://eckra.com"
                  value={origin}
                  maxLength={2048}
                  onChange={(event) => setOrigin(event.target.value)}
                />
                <p>You can connect your website later in this application's settings.</p>
              </div>
            )}
            {step === 2 && (
              <fieldset className="onboarding-focus-options">
                <legend className="sr-only">Your feedback focus</legend>
                {focuses.map(({ id, label, hint, icon: Icon }) => (
                  <label key={id}>
                    <input
                      type="radio"
                      name="focus"
                      checked={focus === id}
                      onChange={() => setFocus(id)}
                    />
                    <Icon />
                    <span>
                      <strong>{label}</strong>
                      <small>{hint}</small>
                    </span>
                    <span className="onboarding-radio">{focus === id && <Check />}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {step === 3 && (
              <div className="onboarding-ready">
                <div className="onboarding-workspace-badge">
                  <span>{name.trim().slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{name}</strong>
                    <small>
                      {role} · {focuses.find((item) => item.id === focus)?.label}
                    </small>
                  </div>
                  <Check />
                </div>
                {[
                  {
                    icon: Code2,
                    title: "Connect your website",
                    body: "Install the Filika SDK with your collector project’s key and allowed origin.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Keep people in control",
                    body: "People review and confirm each report before anything is sent.",
                  },
                  {
                    icon: MessageSquare,
                    title: "Turn feedback into understanding",
                    body: "Open a report, see the context, and decide what to improve.",
                  },
                ].map(({ icon: Icon, title: itemTitle, body }) => (
                  <div className="onboarding-ready-step" key={itemTitle}>
                    <Icon />
                    <div>
                      <h2>{itemTitle}</h2>
                      <p>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && (
              <p role="alert" className="onboarding-error">
                {error}
              </p>
            )}
            <button
              className="onboarding-continue"
              type="button"
              disabled={saving || (step === 0 && !role) || (step === 1 && (!name.trim() || !slug))}
              onClick={step === 3 ? () => void finish() : continueStep}
            >
              {saving ? "Creating application…" : step === 3 ? "Create application" : "Continue"}
              <ArrowRight />
            </button>
            {step === 3 && (
              <p className="onboarding-setup-note">
                Your website still needs an SDK connection to send reports.
              </p>
            )}
          </div>
        )}
        <footer className="onboarding-footer">
          <div
            className="onboarding-progress"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={step + 1}
          >
            {[0, 1, 2, 3].map((value) => (
              <span key={value} data-active={value <= step} />
            ))}
          </div>
          <span>{String(step + 1).padStart(2, "0")} / 04</span>
        </footer>
      </section>
    </main>
  );
}

function ProductPreview({ step, applicationName }: { step: number; applicationName: string }) {
  return (
    <div className="onboarding-product-preview" aria-hidden="true">
      <div className="preview-sidebar">
        <span className="preview-filika">Filika</span>
        <span className="preview-workspace">{applicationName}</span>
        <div>
          <Inbox />
          Overview
        </div>
        <div className="preview-nav-active">
          <MessageSquare />
          All feedback<span>4</span>
        </div>
        <div>
          <Lightbulb />
          Ideas
        </div>
        <p>Your feedback, together.</p>
      </div>
      <div className="preview-inbox">
        <div className="preview-inbox-heading">
          <span>All feedback</span>
          <Sparkles />
        </div>
        <div className="preview-inbox-tabs">
          <span>All reports</span>
          <span>Bugs</span>
          <span>Ideas</span>
        </div>
        {[
          {
            icon: Bug,
            title: "The save button isn’t responding",
            page: "/settings",
            kind: "Bug report",
            time: "2m",
          },
          {
            icon: Lightbulb,
            title: "A keyboard shortcut would help",
            page: "/dashboard",
            kind: "Idea",
            time: "12m",
          },
          {
            icon: CircleHelp,
            title: "Not sure if my changes were saved",
            page: "/editor",
            kind: "Confusing behavior",
            time: "24m",
          },
          {
            icon: CircleSlash,
            title: "I can’t complete the last step",
            page: "/checkout",
            kind: "Blocked task",
            time: "1h",
          },
        ].map(({ icon: Icon, title, page, kind, time }, index) => (
          <div
            className={`preview-report${index === step ? " preview-report-highlighted" : ""}`}
            key={title}
          >
            <Icon />
            <div>
              <strong>{title}</strong>
              <p>
                {page} · {kind}
              </p>
            </div>
            <small>{time}</small>
          </div>
        ))}
        <div className="preview-report-note">
          <ShieldCheck />
          <span>
            Shared by a person.
            <br />
            <strong>Ready for your attention.</strong>
          </span>
        </div>
        <span className="preview-cursor">
          <MousePointer2 /> You
        </span>
      </div>
    </div>
  );
}
