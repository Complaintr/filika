"use client";

import {
  Copy,
  FlaskConical,
  GitBranch,
  Globe2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useApplication } from "@/applications/application-context";
import { DemoDataSettings } from "@/applications/demo-data-settings";
import { GitHubSettings } from "@/applications/github-settings";
import { SaveSettings, SettingsLayout } from "@/applications/settings-layout";
import { type ApplicationSettings, saveApplication } from "@/services/applications-api";
import { fetchDashboard } from "@/services/workspace-api";
import { useConnection } from "@/workspace/connection";

const sections = [
  {
    id: "github",
    label: "GitHub",
    icon: GitBranch,
    description: "Connect a repository and export reports after review.",
  },
  {
    id: "application",
    label: "Application",
    icon: SlidersHorizontal,
    description: "The name and dashboard defaults for this application.",
  },
  {
    id: "connection",
    label: "Collector connection",
    icon: Globe2,
    description: "Connect this application's website and approve its origins.",
  },
  {
    id: "privacy",
    label: "Privacy & data",
    icon: ShieldCheck,
    description: "The boundaries around this application's feedback.",
  },
  {
    id: "demo",
    label: "Demo data",
    icon: FlaskConical,
    description: "Load or remove sample feedback for this application.",
  },
];

export default function ApplicationSettingsPage() {
  const { application, refresh } = useApplication();
  const { reportConnection } = useConnection();
  const [active, setActive] = useState("application");
  const [name, setName] = useState(application?.displayName ?? "");
  const [days, setDays] = useState<7 | 30 | 90>(application?.dashboardDays ?? 30);
  const [origins, setOrigins] = useState(application?.allowedOrigins.join("\n") ?? "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState("idle");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("github")) setActive("github");
  }, []);
  if (!application) return null;
  const app = application;
  const dirty =
    name !== app.displayName ||
    days !== app.dashboardDays ||
    origins !== app.allowedOrigins.join("\n");
  function discard() {
    setName(app.displayName);
    setDays(app.dashboardDays);
    setOrigins(app.allowedOrigins.join("\n"));
    setStatus("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setStatus("Enter an application name before saving.");
      setActive("application");
      return;
    }
    setSaving(true);
    setStatus("");
    const request = new AbortController();
    controller.current = request;
    const settings: ApplicationSettings = {
      displayName: name.trim(),
      dashboardDays: days,
      allowedOrigins: origins
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
    try {
      const saved = await saveApplication(app.slug, settings, request.signal);
      if (request.signal.aborted) return;
      setName(saved.displayName);
      setOrigins(saved.allowedOrigins.join("\n"));
      refresh();
      setStatus("Your changes are saved.");
    } catch (error) {
      if (!request.signal.aborted)
        setStatus(error instanceof Error ? error.message : "Changes could not be saved.");
    } finally {
      if (!request.signal.aborted) setSaving(false);
    }
  }
  async function checkConnection() {
    if (connection === "checking") return;
    setConnection("checking");
    const request = new AbortController();
    controller.current = request;
    try {
      await fetchDashboard(7, request.signal, app.slug);
      if (!request.signal.aborted) {
        setConnection("connected");
        reportConnection(true);
      }
    } catch {
      if (!request.signal.aborted) {
        setConnection("offline");
        reportConnection(false);
      }
    }
  }
  async function copyKey() {
    try {
      await navigator.clipboard.writeText(app.projectKey);
      setStatus("Application key copied.");
    } catch {
      setStatus("Could not copy. Select the application key and copy it manually.");
    }
  }
  return (
    <SettingsLayout
      title="Settings"
      description={`Settings for ${app.displayName}. Account preferences stay separate.`}
      sections={sections}
      active={active}
      onSelect={setActive}
    >
      <form onSubmit={save}>
        <fieldset className="settings-form-fields" disabled={saving}>
          {active === "github" && <GitHubSettings key={app.slug} appSlug={app.slug} />}
          {active === "application" && (
            <div className="settings-section-body">
              <div className="workspace-name-preview">
                <span>{name.trim().slice(0, 1).toUpperCase() || "A"}</span>
                <div>
                  <strong>{name || "Your application"}</strong>
                  <p>/{app.slug}</p>
                </div>
              </div>
              <div className="studio-setting">
                <label htmlFor="application-name">
                  Application name<span>Shown in your application switcher.</span>
                </label>
                <input
                  id="application-name"
                  className="studio-input"
                  required
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="studio-setting">
                <label htmlFor="application-url">
                  Application URL
                  <span>This address stays fixed when you rename the application.</span>
                </label>
                <input
                  id="application-url"
                  className="studio-input"
                  readOnly
                  value={`/${app.slug}`}
                />
              </div>
              <div className="studio-setting">
                <label htmlFor="default-range">
                  Dashboard date range<span>The default period for this application.</span>
                </label>
                <select
                  id="default-range"
                  className="studio-input"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
            </div>
          )}
          {active === "connection" && (
            <div className="settings-section-body">
              <div className="studio-setting">
                <label htmlFor="allowed-origins">
                  Allowed origins
                  <span>
                    One exact origin per line, such as https://my-store.example. HTTP is allowed
                    only for localhost development.
                  </span>
                </label>
                <textarea
                  id="allowed-origins"
                  className="studio-input"
                  rows={4}
                  maxLength={4096}
                  value={origins}
                  onChange={(e) => setOrigins(e.target.value)}
                />
              </div>
              <p className="muted">
                No origins means the collector rejects feedback for this application until you add
                one.
              </p>
              <div className="settings-info-row">
                <div>
                  <h3>Application key</h3>
                  <p>This public key identifies {app.displayName} in the Filika SDK.</p>
                  <code className="settings-endpoint">{app.projectKey}</code>
                </div>
                <button className="studio-button" type="button" onClick={() => void copyKey()}>
                  <Copy /> Copy key
                </button>
              </div>
              <div className="settings-info-row">
                <div>
                  <h3>Ingest endpoint</h3>
                  <code className="settings-endpoint">/api/v1/feedback</code>
                </div>
              </div>
              <div className="settings-info-row">
                <div>
                  <h3>Connection status</h3>
                  <p>
                    {connection === "connected"
                      ? "The collector and database are responding."
                      : connection === "offline"
                        ? "Could not connect. Check DATABASE_URL and try again."
                        : "Check that this application's collector is responding."}
                  </p>
                </div>
                <button
                  className="studio-button"
                  type="button"
                  disabled={connection === "checking"}
                  onClick={() => void checkConnection()}
                >
                  <RefreshCw />
                  {connection === "checking" ? "Checking…" : "Check connection"}
                </button>
              </div>
            </div>
          )}
          {active === "privacy" && (
            <div className="settings-section-body">
              <h3>Feedback transmission</h3>
              <p>
                Agent reports are transmitted as the agent drafts them, after the agent confirms
                with the user. Reports belong only to this application.
              </p>
              <h3>Retention</h3>
              <p>
                Feedback is retained for {app.retentionHours} hours under the collector's cleanup
                policy.
              </p>
              <h3>No ambient collection</h3>
              <p>
                The SDK does not collect page content, screenshots, credentials, or browsing
                history.
              </p>
            </div>
          )}
          {active === "demo" && <DemoDataSettings appSlug={app.slug} />}
          {active !== "privacy" && active !== "github" && active !== "demo" && (
            <SaveSettings dirty={dirty} saving={saving} onDiscard={discard} />
          )}
        </fieldset>
      </form>
      <p className="settings-save-status" role="status">
        {status}
      </p>
    </SettingsLayout>
  );
}
