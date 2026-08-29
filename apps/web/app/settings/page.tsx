"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDashboard } from "@/services/workspace-api";
import { useConnection } from "@/workspace/connection";
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  readPreferences,
  savePreferences,
} from "@/workspace/preferences";

export default function SettingsPage() {
  const { reportConnection } = useConnection();
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences());
  const [name, setName] = useState(preferences.workspaceName);
  const [days, setDays] = useState<number>(preferences.days);
  const [density, setDensity] = useState<"comfortable" | "compact">(preferences.density);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(preferences.theme);
  const [saveStatus, setSaveStatus] = useState("");
  const [checkStatus, setCheckStatus] = useState("Checking the collector…");
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);

  const checkConnection = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setCheckStatus("Checking the collector…");
    try {
      await fetchDashboard(7, AbortSignal.timeout(10_000));
      reportConnection(true);
      setCheckStatus("Connected. The collector and database are responding.");
    } catch {
      reportConnection(false);
      setCheckStatus("Could not connect. Check the collector address and database.");
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [reportConnection]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  function restoreDefaults() {
    setName(DEFAULT_PREFERENCES.workspaceName);
    setDays(DEFAULT_PREFERENCES.days);
    setDensity(DEFAULT_PREFERENCES.density);
    setTheme(DEFAULT_PREFERENCES.theme);
    setSaveStatus("Defaults restored. Save changes to apply them.");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setSaveStatus("");
      return;
    }
    const next: Preferences = {
      workspaceName: name.trim().slice(0, 60),
      days: days === 7 || days === 90 ? days : 30,
      density,
      theme,
    };
    if (!savePreferences(next)) {
      setSaveStatus(
        "Your browser could not save these settings. Allow local storage and try again.",
      );
      return;
    }
    setPreferences(next);
    document.documentElement.dataset.density = next.density;
    document.documentElement.dataset.theme =
      next.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next.theme;
    window.dispatchEvent(new CustomEvent("filika:preferences"));
    setSaveStatus("Changes saved.");
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>Settings</h1>
          <p className="muted">Make this workspace feel like yours.</p>
        </div>
      </div>
      <div className="settings-grid">
        <div className="settings-main">
          <form className="panel settings-panel" onSubmit={submit}>
            <div className="panel-heading">
              <h2>Workspace preferences</h2>
              <span className="subtle-badge">This browser</span>
            </div>
            <SettingRow
              id="workspace-name"
              title="Workspace name"
              hint="A display name for this browser. It does not rename collector projects."
            >
              <input
                id="workspace-name"
                className="input"
                type="text"
                maxLength={60}
                required
                autoComplete="off"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </SettingRow>
            <SettingRow
              id="default-range"
              title="Default date range"
              hint="The period shown when you open your dashboard."
            >
              <select
                id="default-range"
                className="select"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </SettingRow>
            <SettingRow
              id="table-density"
              title="Table density"
              hint="Choose how much space complaint rows use."
            >
              <select
                id="table-density"
                className="select"
                value={density}
                onChange={(event) =>
                  setDensity(event.target.value === "compact" ? "compact" : "comfortable")
                }
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </SettingRow>
            <fieldset className="setting-row appearance-setting">
              <legend className="sr-only">Appearance</legend>
              <div>
                <span className="setting-label">Appearance</span>
                <p className="muted small">Choose the workspace theme used on this browser.</p>
              </div>
              <div className="theme-options">
                <label className="theme-option">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={theme === "light"}
                    onChange={() => setTheme("light")}
                  />
                  <span className="theme-preview theme-preview-light" aria-hidden="true">
                    <span />
                    <span />
                  </span>
                  <span>Light</span>
                </label>
                <label className="theme-option">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={theme === "dark"}
                    onChange={() => setTheme("dark")}
                  />
                  <span className="theme-preview theme-preview-dark" aria-hidden="true">
                    <span />
                    <span />
                  </span>
                  <span>Dark</span>
                </label>
                <label className="theme-option">
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={theme === "system"}
                    onChange={() => setTheme("system")}
                  />
                  <span className="theme-preview theme-preview-system" aria-hidden="true">
                    <span />
                    <span />
                  </span>
                  <span>System</span>
                </label>
              </div>
            </fieldset>
            <div className="settings-form-footer">
              <button className="button" type="button" onClick={restoreDefaults}>
                Restore defaults
              </button>
              <button className="button button-primary" type="submit">
                Save changes
              </button>
            </div>
            <p className="save-status small" role="status">
              {saveStatus}
            </p>
          </form>
          <section className="panel settings-panel">
            <div className="panel-heading">
              <h2>Collector connection</h2>
              <span className="connection-globe" aria-hidden="true">
                <GlobeIcon />
              </span>
            </div>
            <div className="connection-info">
              <p>Your workspace reads reports from the collector API on this server.</p>
              <code className="endpoint">/api/v1/inbox</code>
              <p className="muted small">
                The collector runs in the same Next.js server. DATABASE_URL in .env points at
                PostgreSQL.
              </p>
            </div>
            <div className="connection-actions">
              <p className="small muted" role="status">
                {checkStatus}
              </p>
              <button
                className="button"
                type="button"
                onClick={() => void checkConnection()}
                disabled={checking}
              >
                <RefreshIcon />
                Check connection
              </button>
            </div>
          </section>
        </div>
        <aside className="settings-aside">
          <section className="privacy-card">
            <span className="privacy-icon" aria-hidden="true">
              <ShieldIcon />
            </span>
            <h2>Feedback, with boundaries.</h2>
            <p className="muted">
              Users review every agent-authored report before it is sent. Your workspace only shows
              the feedback they chose to share.
            </p>
            <ul className="privacy-list">
              <li>
                <CheckIcon />
                <span>No page content or browsing history</span>
              </li>
              <li>
                <CheckIcon />
                <span>No screenshots or credentials</span>
              </li>
              <li>
                <CheckIcon />
                <span>No agent tools on management pages</span>
              </li>
            </ul>
          </section>
          <section className="settings-note">
            <h3>About this workspace</h3>
            <p className="muted small">
              This is a local, read-only management interface. Reports remain publicly readable
              through the collector API. There are no accounts or access controls; keep the
              collector on a trusted network.
            </p>
            <p className="muted small">
              Retention is configured per collector project. Expired records remain in counts until
              the cleanup command runs.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function SettingRow({
  children,
  hint,
  id,
  title,
}: {
  children: React.ReactNode;
  hint: string;
  id: string;
  title: string;
}) {
  return (
    <div className="setting-row">
      <div>
        <label className="setting-label" htmlFor={id}>
          {title}
        </label>
        <p className="muted small" id={`${id}-hint`}>
          {hint}
        </p>
      </div>
      <div aria-describedby={`${id}-hint`}>{children}</div>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M3 12h18 M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z M8 12l3 3 5-6" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 12l4 4L19 6" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 13 2 M18 18A8 8 0 0 1 5 16" />
    </svg>
  );
}
