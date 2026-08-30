"use client";

import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Globe2,
  Laptop,
  LogOut,
  Moon,
  Paintbrush,
  PanelLeft,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { fetchSession, type SessionInfo, signOut } from "@/services/session";
import { fetchDashboard } from "@/services/workspace-api";
import { useConnection } from "@/workspace/connection";
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  readPreferences,
  savePreferences,
} from "@/workspace/preferences";

type Section = "workspace" | "appearance" | "account" | "connection" | "privacy";
const sections = [
  {
    id: "workspace",
    label: "Workspace",
    icon: SlidersHorizontal,
    description: "A few small details to make this space yours.",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Paintbrush,
    description: "Find a comfortable view for your everyday work.",
  },
  {
    id: "account",
    label: "Your account",
    icon: UserRound,
    description: "Your identity and access to this workspace.",
  },
  {
    id: "connection",
    label: "Collector connection",
    icon: Globe2,
    description: "Where feedback arrives, and how your workspace connects.",
  },
  {
    id: "privacy",
    label: "Privacy & data",
    icon: ShieldCheck,
    description: "Clear boundaries around every piece of feedback.",
  },
] as const;

export default function SettingsPage() {
  const { reportConnection } = useConnection();
  const [active, setActive] = useState<Section>("workspace");
  const [saved, setSaved] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [draft, setDraft] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [status, setStatus] = useState("");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionStatus, setSessionStatus] = useState("Loading your account…");
  const [connection, setConnection] = useState<"idle" | "checking" | "connected" | "offline">(
    "idle",
  );
  const checking = useRef<AbortController | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const section = sections.find((item) => item.id === active) ?? sections[0];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    const current = readPreferences();
    setSaved(current);
    setDraft(current);
    const controller = new AbortController();
    fetchSession(controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setSession(value);
        setSessionStatus(
          value ? "" : "Your session has ended. Sign in again to view your account.",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setSessionStatus("We couldn’t load your account. Refresh the page to try again.");
      });
    return () => {
      controller.abort();
      checking.current?.abort();
    };
  }, []);

  function update(next: Partial<Preferences>) {
    setDraft((current) => ({ ...current, ...next }));
    setStatus("");
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.workspaceName.trim()) {
      setActive("workspace");
      setStatus("Enter a workspace name before saving.");
      return;
    }
    const next = { ...draft, workspaceName: draft.workspaceName.trim().slice(0, 60) };
    if (!savePreferences(next)) {
      setStatus(
        "Your browser could not save these preferences. Allow local storage and try again.",
      );
      return;
    }
    setSaved(next);
    setDraft(next);
    window.dispatchEvent(new CustomEvent("filika:preferences"));
    setStatus("Your changes are saved.");
  }

  async function checkConnection() {
    if (checking.current) return;
    const controller = new AbortController();
    checking.current = controller;
    setConnection("checking");
    try {
      await fetchDashboard(7, controller.signal);
      if (!controller.signal.aborted) {
        reportConnection(true);
        setConnection("connected");
      }
    } catch {
      if (!controller.signal.aborted) {
        reportConnection(false);
        setConnection("offline");
      }
    } finally {
      checking.current = null;
    }
  }

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/api/v1/feedback`);
      setCopyStatus("Endpoint copied");
    } catch {
      setCopyStatus("Could not copy. The endpoint is /api/v1/feedback.");
    }
  }

  return (
    <div className="settings-studio">
      <header className="studio-page-heading">
        <div>
          <p className="studio-eyebrow">Your space, your way</p>
          <h1>
            Settings<span className="heading-dot">.</span>
          </h1>
        </div>
        <span className="studio-local-badge">
          <Laptop /> Preferences for this browser
        </span>
      </header>
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <p className="settings-nav-label">Preferences</p>
          <nav aria-label="Settings sections">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                aria-current={active === id ? "page" : undefined}
                onClick={() => {
                  setActive(id);
                  setStatus("");
                }}
              >
                <Icon />
                <span>{label}</span>
                <ChevronRight />
              </button>
            ))}
          </nav>
          <div className="settings-sidebar-guide">
            <span className="settings-guide-icon">
              <PanelLeft />
            </span>
            <h3>A good place to start</h3>
            <p>A quick introduction to your feedback workspace.</p>
            <Link href="/onboarding?edit=1">
              Open the guide <ArrowRight />
            </Link>
          </div>
          <Link href="/terms" className="settings-terms">
            Terms of Service ↗
          </Link>
        </aside>
        <div className="settings-content">
          <header className="settings-section-heading">
            <h2>{section.label}</h2>
            <p>{section.description}</p>
          </header>
          <form onSubmit={save}>
            {active === "workspace" && (
              <div className="settings-section-body">
                <div className="workspace-name-preview">
                  <span>{draft.workspaceName.trim().slice(0, 1).toUpperCase() || "F"}</span>
                  <div>
                    <strong>{draft.workspaceName.trim() || "Your workspace"}</strong>
                    <p>Your corner of Filika</p>
                  </div>
                </div>
                <div className="studio-setting">
                  <label htmlFor="workspace-name">
                    Workspace name
                    <span>A local display name. Collector project names stay unchanged.</span>
                  </label>
                  <input
                    className="studio-input"
                    id="workspace-name"
                    value={draft.workspaceName}
                    maxLength={60}
                    required
                    onChange={(event) => update({ workspaceName: event.target.value })}
                  />
                </div>
                <div className="studio-setting">
                  <label htmlFor="default-range">
                    Dashboard date range<span>The period you see when opening your dashboard.</span>
                  </label>
                  <select
                    className="studio-input"
                    id="default-range"
                    value={draft.days}
                    onChange={(event) =>
                      update({
                        days:
                          Number(event.target.value) === 7
                            ? 7
                            : Number(event.target.value) === 90
                              ? 90
                              : 30,
                      })
                    }
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
                <div className="settings-inline-note">
                  <Laptop />
                  <p>
                    These preferences belong to this browser. They don’t change what other
                    maintainers see.
                  </p>
                </div>
              </div>
            )}
            {active === "appearance" && (
              <div className="settings-section-body">
                <fieldset className="studio-fieldset">
                  <legend>Color theme</legend>
                  <p>Choose a look, or follow your device’s setting.</p>
                  <div className="appearance-choices">
                    {[
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Laptop },
                    ].map(({ value, label, icon: Icon }) => (
                      <label key={value} className={`appearance-choice appearance-${value}`}>
                        <input
                          type="radio"
                          name="theme"
                          value={value}
                          checked={draft.theme === value}
                          onChange={() =>
                            update({
                              theme:
                                value === "dark" ? "dark" : value === "system" ? "system" : "light",
                            })
                          }
                        />
                        <span className="appearance-mini" aria-hidden="true">
                          <span className="appearance-mini-sidebar" />
                          <span className="appearance-mini-body">
                            <i />
                            <i />
                            <i />
                          </span>
                        </span>
                        <span className="appearance-choice-label">
                          <Icon />
                          {label}
                          <span className="appearance-check">
                            {draft.theme === value && <Check />}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="studio-fieldset">
                  <legend>Inbox spacing</legend>
                  <p>A little breathing room, or more reports at a glance.</p>
                  <div className="density-choices">
                    {(["comfortable", "compact"] as const).map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="density"
                          checked={draft.density === value}
                          onChange={() => update({ density: value })}
                        />
                        <span className={`density-lines density-${value}`} aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        <strong>{value === "comfortable" ? "Comfortable" : "Compact"}</strong>
                        <span>{value === "comfortable" ? "Room to focus" : "More in view"}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
            {(active === "workspace" || active === "appearance") && (
              <footer className="settings-save-bar">
                <button
                  className="studio-text-button"
                  type="button"
                  onClick={() => {
                    setDraft(saved);
                    setStatus("");
                  }}
                  disabled={!dirty}
                >
                  Discard changes
                </button>
                <div>
                  <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
                  <button
                    className="studio-button studio-button-primary"
                    type="submit"
                    disabled={!dirty}
                  >
                    Save changes <Check />
                  </button>
                </div>
              </footer>
            )}
          </form>
          {active === "account" && (
            <div className="settings-section-body">
              {session ? (
                <>
                  <div className="account-profile">
                    <span className="account-avatar">
                      {session.user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <h3>{session.user.name}</h3>
                      <p>{session.user.email}</p>
                    </div>
                  </div>
                  <div className="settings-info-row">
                    <div>
                      <h3>Email address</h3>
                      <p>Your identity for signing in to Filika.</p>
                    </div>
                    <span>{session.user.email}</span>
                  </div>
                  <div className="settings-info-row">
                    <div>
                      <h3>Password & recovery</h3>
                      <p>Request a secure link to set a new password.</p>
                    </div>
                    <Link className="studio-button" href="/forgot-password">
                      Reset password <ArrowRight />
                    </Link>
                  </div>
                  <div className="settings-info-row">
                    <div>
                      <h3>End this session</h3>
                      <p>You can sign in again whenever you’re ready.</p>
                    </div>
                    <button className="studio-button" type="button" onClick={() => void signOut()}>
                      <LogOut /> Sign out
                    </button>
                  </div>
                </>
              ) : (
                <p className="settings-inline-note" role="status">
                  {sessionStatus}
                </p>
              )}
            </div>
          )}
          {active === "connection" && (
            <div className="settings-section-body">
              <div className={`collector-overview collector-${connection}`}>
                <span className="collector-symbol">
                  <Globe2 />
                </span>
                <div>
                  <h3>Your feedback collector</h3>
                  <p>
                    {connection === "connected"
                      ? "Connected. Ready to receive and display reports."
                      : connection === "offline"
                        ? "Unavailable. Check your server and database configuration."
                        : connection === "checking"
                          ? "Connecting to your collector…"
                          : "Your workspace uses the collector on this server."}
                  </p>
                </div>
                <span className="collector-status-dot" />
              </div>
              <div className="settings-info-row">
                <div>
                  <h3>Ingest endpoint</h3>
                  <p>Where your website sends user-confirmed reports.</p>
                  <code className="settings-endpoint">/api/v1/feedback</code>
                </div>
                <button className="studio-button" type="button" onClick={() => void copyEndpoint()}>
                  <Copy /> Copy endpoint
                </button>
              </div>
              <p className="settings-copy-status" role="status">
                {copyStatus}
              </p>
              <div className="settings-info-row">
                <div>
                  <h3>Connection status</h3>
                  <p>Check that the collector and database are responding.</p>
                </div>
                <button
                  className="studio-button"
                  type="button"
                  disabled={connection === "checking"}
                  onClick={() => void checkConnection()}
                >
                  <RefreshCw className={connection === "checking" ? "studio-spinning" : ""} />
                  {connection === "checking" ? "Checking…" : "Check connection"}
                </button>
              </div>
              <p role="status" className="settings-copy-status">
                {connection === "connected"
                  ? "The collector and database are responding."
                  : connection === "offline"
                    ? "Could not connect. Check DATABASE_URL in your server configuration."
                    : ""}
              </p>
              <div className="settings-inline-note">
                <ShieldCheck />
                <p>
                  Project keys and allowed origins are configured on the server. Copying this
                  endpoint does not install the SDK or connect a website.
                </p>
              </div>
            </div>
          )}
          {active === "privacy" && (
            <div className="settings-section-body">
              <div className="privacy-intro">
                <ShieldCheck />
                <h3>
                  Useful feedback.
                  <br />
                  Clear boundaries.
                </h3>
                <p>
                  Filika collects the report a person chooses to send, after they have had a chance
                  to review it.
                </p>
              </div>
              {[
                {
                  title: "Reviewed before it leaves the page",
                  body: "People can edit, remove, or cancel an agent-authored draft before confirming it. Manual feedback is always available.",
                },
                {
                  title: "No ambient collection",
                  body: "Filika does not automatically collect page content, credentials, screenshots, or browsing history.",
                },
                {
                  title: "Read-only maintainer workspace",
                  body: "External feedback is displayed as text. Browser agent tools are never registered on these management pages.",
                },
                {
                  title: "Retention belongs to the project",
                  body: "Your collector project defines how long reports remain available. Data cleanup is managed on the server.",
                },
              ].map(({ title, body }) => (
                <div key={title} className="privacy-principle">
                  <Check />
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </div>
              ))}
              <Link className="studio-text-button" href="/terms">
                Read the Terms of Service <ArrowRight />
              </Link>
            </div>
          )}
          <p className="settings-save-status" role="status">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
