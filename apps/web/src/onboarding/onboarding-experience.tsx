"use client";

import {
  ArrowRight,
  Bug,
  Check,
  ChevronLeft,
  CircleHelp,
  CircleSlash,
  Clipboard,
  Code2,
  ExternalLink,
  Inbox,
  Lightbulb,
  MessageSquare,
  MousePointer2,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthHeader } from "@/auth/auth-header";
import {
  type Application,
  applicationPath,
  createApplication,
  fetchApplication,
  fetchApplications,
} from "@/services/applications-api";
import { fetchSession } from "@/services/session";
import { type ComplaintPage, fetchComplaints } from "@/services/workspace-api";
import { createInstallSnippet, createSetupBrief, TEST_FEEDBACK_PROMPT } from "./setup";

const STEP_LABELS = ["Create", "Install", "Verify", "Ready"] as const;
const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function exactWebsiteOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const localHttp = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
    if (
      url.origin !== value.trim() ||
      url.username ||
      url.password ||
      (url.protocol !== "https:" && !localHttp)
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function OnboardingExperience() {
  const [step, setStep] = useState(0);
  const [application, setApplication] = useState<Application | null>(null);
  const [additional, setAdditional] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [origin, setOrigin] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pollStopped, setPollStopped] = useState(false);
  const [pollGeneration, setPollGeneration] = useState(0);
  const [firstReport, setFirstReport] = useState<ComplaintPage["items"][number] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current = controller;
    void fetchSession(controller.signal)
      .then(async (session) => {
        if (controller.signal.aborted) return;
        if (!session) {
          window.location.replace("/login?force=1");
          return;
        }
        const applications = await fetchApplications(controller.signal);
        if (controller.signal.aborted) return;
        const params = new URLSearchParams(window.location.search);
        const resumeSlug = params.get("app");
        const resumed = applications.find((item) => item.slug === resumeSlug);
        const firstApplication = applications[0];
        if (resumeSlug && !resumed) {
          setError("This application is not available in your account.");
        } else if (resumed) {
          setApplication(resumed);
          setName(resumed.displayName);
          setSlug(resumed.slug);
          setOrigin(resumed.allowedOrigins[0] ?? "");
          setAdditional(applications.length > 1);
          setStep(resumed.integrationVerifiedAt ? 3 : 1);
        } else if (firstApplication && !params.has("new")) {
          window.location.replace(applicationPath(firstApplication.slug, "complaints"));
          return;
        } else {
          setAdditional(applications.length > 0);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Your setup could not be loaded. Sign in again to continue.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Each step renders a new heading that must receive focus.
  useEffect(() => {
    if (!loading) headingRef.current?.focus({ preventScroll: true });
  }, [loading, step]);

  const applicationSlug = application?.slug;
  useEffect(() => {
    if (step !== 2 || !applicationSlug) return;
    void pollGeneration;
    const controller = new AbortController();
    requestRef.current = controller;
    const startedAt = Date.now();
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPollStopped(false);

    const poll = async () => {
      if (controller.signal.aborted) return;
      if (Date.now() - startedAt >= 10 * 60 * 1000) {
        setChecking(false);
        setPollStopped(true);
        return;
      }
      if (document.hidden) {
        timer = setTimeout(poll, 10_000);
        return;
      }
      setChecking(true);
      try {
        const latest = await fetchApplication(applicationSlug, controller.signal);
        if (controller.signal.aborted) return;
        setApplication(latest);
        if (latest.integrationVerifiedAt) {
          const reports = await fetchComplaints(
            { search: "", kind: "", cursor: null },
            controller.signal,
            latest.slug,
          );
          if (controller.signal.aborted) return;
          setFirstReport(reports.items[0] ?? null);
          setChecking(false);
          setStep(3);
          return;
        }
        setError("");
      } catch {
        if (!controller.signal.aborted) {
          setError("Filika could not check the inbox. The next check will retry automatically.");
        }
      }
      attempts += 1;
      setChecking(false);
      timer = setTimeout(poll, attempts < 20 ? 3_000 : 10_000);
    };
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [applicationSlug, pollGeneration, step]);

  async function createWorkspace() {
    if (busy) return;
    const websiteOrigin = exactWebsiteOrigin(origin);
    if (!name.trim() || slug.length < 2 || !SLUG_PATTERN.test(slug) || !websiteOrigin) {
      setError("Enter an application name, an available URL, and an exact HTTPS website origin.");
      return;
    }
    setBusy(true);
    setError("");
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const created = await createApplication(
        {
          displayName: name.trim(),
          slug,
          dashboardDays: 30,
          allowedOrigins: [websiteOrigin],
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setApplication(created);
      setOrigin(websiteOrigin);
      window.history.replaceState(null, "", `/onboarding?app=${encodeURIComponent(created.slug)}`);
      setStep(1);
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof Error ? caught.message : "Your application could not be created.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function copy(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(success);
      setError("");
    } catch {
      setError("Copy failed. Select the text and copy it manually.");
    }
  }

  const collectorOrigin =
    typeof window === "undefined" ? "https://filika.example" : window.location.origin;
  const snippet = application ? createInstallSnippet(collectorOrigin, application.projectKey) : "";
  const setupBrief = application
    ? createSetupBrief({
        applicationName: application.displayName,
        collectorOrigin,
        projectKey: application.projectKey,
        websiteOrigin: origin,
      })
    : "";
  const inboxPath = application ? applicationPath(application.slug, "complaints") : "/account";

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
      <section className="onboarding-main" aria-busy={busy || loading}>
        <AuthHeader />
        <div className="onboarding-top-actions">
          <button
            className="studio-icon-button"
            type="button"
            aria-label="Previous step"
            disabled={step < 2 || loading || busy}
            onClick={() => {
              setStep((value) => Math.max(1, value - 1));
              setError("");
            }}
          >
            <ChevronLeft />
          </button>
          <Link href={application ? inboxPath : "/account"}>
            {application ? "Exit setup" : "Account settings"} <ArrowRight />
          </Link>
        </div>
        {loading ? (
          <div className="onboarding-content" role="status">
            <p className="studio-eyebrow">Preparing the lab</p>
            <h1>Loading your setup…</h1>
          </div>
        ) : step === 0 ? (
          <div className="onboarding-content">
            <p className="studio-eyebrow">
              {additional ? "Create another application" : "Create your feedback space"}
            </p>
            <h1 ref={headingRef} tabIndex={-1}>
              Where should feedback land?
            </h1>
            <p className="onboarding-description">
              Start with the product you want to hear from. Filika will make a private inbox for its
              reviewed reports.
            </p>
            <div className="onboarding-name">
              <label htmlFor="onboarding-name">Application name</label>
              <input
                className="studio-input"
                id="onboarding-name"
                maxLength={60}
                value={name}
                placeholder="Eckra"
                onChange={(event) => {
                  const value = event.target.value;
                  setName(value);
                  if (!slugEdited) setSlug(slugify(value));
                }}
              />
              <label htmlFor="onboarding-origin">Website origin</label>
              <input
                className="studio-input"
                id="onboarding-origin"
                type="url"
                maxLength={2048}
                value={origin}
                placeholder="https://eckra.com"
                onChange={(event) => setOrigin(event.target.value)}
              />
              <p>Use the exact origin. Paths and trailing slashes are not included.</p>
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
            </div>
            <button
              className="onboarding-continue"
              type="button"
              disabled={busy}
              onClick={() => void createWorkspace()}
            >
              {busy ? "Creating application…" : "Create application"} <ArrowRight />
            </button>
          </div>
        ) : step === 1 && application ? (
          <div className="onboarding-content">
            <p className="studio-eyebrow">Install the signal</p>
            <h1 ref={headingRef} tabIndex={-1}>
              Add Filika to {application.displayName}.
            </h1>
            <p className="onboarding-description">
              Paste this before the closing body tag. It registers Filika’s feedback tool without
              reading the page around it.
            </p>
            <div className="onboarding-code-card">
              <div>
                <span>HTML</span>
                <button type="button" onClick={() => void copy(snippet, "Install code copied.")}>
                  <Clipboard /> Copy code
                </button>
              </div>
              <pre>
                <code>{snippet}</code>
              </pre>
            </div>
            <div className="onboarding-handoff">
              <Code2 />
              <div>
                <strong>Someone else handles the code?</strong>
                <p>Copy a complete setup brief with the origin, key, install code, and test.</p>
              </div>
              <button type="button" onClick={() => void copy(setupBrief, "Setup brief copied.")}>
                Copy brief
              </button>
            </div>
            <button
              className="onboarding-continue"
              type="button"
              onClick={() => {
                setNotice("");
                setStep(2);
              }}
            >
              I installed it <ArrowRight />
            </button>
            <button
              className="onboarding-secondary-action"
              type="button"
              onClick={() => window.location.assign(inboxPath)}
            >
              Finish later
            </button>
          </div>
        ) : step === 2 && application ? (
          <div className="onboarding-content">
            <button className="onboarding-back" type="button" onClick={() => setStep(1)}>
              <ChevronLeft /> Back to install
            </button>
            <p className="studio-eyebrow">Verify the whole journey</p>
            <h1 ref={headingRef} tabIndex={-1}>
              Send one real signal.
            </h1>
            <p className="onboarding-description">
              Open your website in a WebMCP-enabled browser, ask its agent to send a test report,
              then review and confirm it. This page will notice when it arrives.
            </p>
            <a className="onboarding-site-link" href={origin} target="_blank" rel="noreferrer">
              Open {new URL(origin).hostname} <ExternalLink />
            </a>
            <div className="onboarding-prompt-card">
              <span>Ask your browser agent</span>
              <p>“{TEST_FEEDBACK_PROMPT}”</p>
              <button
                type="button"
                onClick={() => void copy(TEST_FEEDBACK_PROMPT, "Test prompt copied.")}
              >
                <Clipboard /> Copy prompt
              </button>
            </div>
            <div className="onboarding-listening" role="status">
              <span data-active={checking}>
                <Radio />
              </span>
              <div>
                <strong>
                  {pollStopped ? "Automatic checks paused" : "Listening for your report"}
                </strong>
                <p>
                  {pollStopped
                    ? "Run another check when your report is ready."
                    : "You can keep this page open while you test."}
                </p>
              </div>
              {pollStopped && (
                <button type="button" onClick={() => setPollGeneration((value) => value + 1)}>
                  Check again
                </button>
              )}
            </div>
            <button
              className="onboarding-secondary-action"
              type="button"
              onClick={() => window.location.assign(inboxPath)}
            >
              Finish later
            </button>
          </div>
        ) : application ? (
          <div className="onboarding-content onboarding-success">
            <span className="onboarding-success-mark">
              <Check />
            </span>
            <p className="studio-eyebrow">Signal received</p>
            <h1 ref={headingRef} tabIndex={-1}>
              {application.displayName} is connected.
            </h1>
            <p className="onboarding-description">
              Your reviewed report crossed the whole path and reached its Filika inbox.
            </p>
            {firstReport && (
              <div className="onboarding-first-report">
                <Inbox />
                <div>
                  <span>{firstReport.kind.replaceAll("_", " ")}</span>
                  <strong>{firstReport.title}</strong>
                  <small>{firstReport.requestOrigin}</small>
                </div>
                <Check />
              </div>
            )}
            <Link
              className="onboarding-continue"
              href={firstReport ? `${inboxPath}/${firstReport.feedbackId}` : inboxPath}
            >
              {firstReport ? "Open the first report" : "Open your inbox"} <ArrowRight />
            </Link>
          </div>
        ) : (
          <div className="onboarding-content">
            <h1 ref={headingRef} tabIndex={-1}>
              Setup is unavailable.
            </h1>
            <Link className="onboarding-continue" href="/account">
              Open account settings <ArrowRight />
            </Link>
          </div>
        )}
        {error && (
          <p className="onboarding-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="onboarding-setup-status" role="status">
            {notice}
          </p>
        )}
        <footer className="onboarding-footer">
          <div
            className="onboarding-progress"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={1}
            aria-valuemax={STEP_LABELS.length}
            aria-valuenow={step + 1}
          >
            {STEP_LABELS.map((label, index) => (
              <span key={label} data-active={index <= step} />
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
