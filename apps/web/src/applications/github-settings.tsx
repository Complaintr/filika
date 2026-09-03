"use client";

import type { GitHubStatus } from "@filika/collector/github/contracts";
import { useEffect, useRef, useState } from "react";
import { githubApi } from "@/services/github-api";

export function GitHubSettings({ appSlug }: { appSlug: string }) {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [installations, setInstallations] = useState<{ id: string; login: string }[]>([]);
  const [installationPage, setInstallationPage] = useState<number | null>(null);
  const [installationId, setInstallationId] = useState("");
  const [repositories, setRepositories] = useState<
    { id: string; fullName: string; isPrivate: boolean }[]
  >([]);
  const [repositoryPage, setRepositoryPage] = useState<number | null>(null);
  const [repositoryId, setRepositoryId] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const api = githubApi(appSlug);

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    const client = githubApi(appSlug);
    void client
      .status(request.signal)
      .then(async (value) => {
        if (request.signal.aborted) return;
        setStatus(value);
        if (new URLSearchParams(window.location.search).get("github") === "error")
          setMessage("GitHub authorization was cancelled or failed. Please reconnect.");
        if (value.authorized) {
          const list = await client.installations(1, request.signal);
          if (!request.signal.aborted) {
            setInstallations(list.installations);
            setInstallationPage(list.nextPage);
          }
        }
      })
      .catch((error: unknown) => {
        if (!request.signal.aborted)
          setMessage(error instanceof Error ? error.message : "Could not load GitHub settings.");
      })
      .finally(() => {
        if (!request.signal.aborted) setBusy(false);
      });
    return () => request.abort();
  }, [appSlug]);

  async function action(work: (signal: AbortSignal) => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const request = new AbortController();
    controller.current = request;
    try {
      await work(request.signal);
    } catch (error) {
      if (!request.signal.aborted)
        setMessage(error instanceof Error ? error.message : "GitHub request failed.");
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => () => controller.current?.abort(), []);

  return (
    <div className="settings-section-body" aria-busy={busy}>
      <h3>Repository connection</h3>
      <p>
        Connect one repository to export reviewed reports as GitHub issues. Signing in with GitHub
        does not grant repository access.
      </p>
      {!status && !message && <p role="status">Loading GitHub settings…</p>}
      {status && !status.configured && (
        <p>
          The server operator must configure the Filika GitHub App before repositories can be
          connected.
        </p>
      )}
      {status?.configured && (
        <>
          {status.connection && (
            <>
              <div className="settings-info-row">
                <div>
                  <strong>{status.connection.fullName}</strong>
                  <p>
                    {status.connection.isPrivate ? "Private repository" : "Public repository"} ·{" "}
                    {status.connection.active
                      ? "Connected"
                      : "Access unavailable: select the repository again after restoring access"}
                  </p>
                </div>
              </div>
              <div className="studio-setting">
                <label htmlFor="github-issue-mode">
                  Issue creation
                  <span>Choose whether confirmed feedback needs a second maintainer review.</span>
                </label>
                <select
                  id="github-issue-mode"
                  className="studio-input"
                  value={status.issueMode}
                  disabled={busy || !status.connection.active}
                  onChange={(event) => {
                    const mode = event.target.value === "automatic" ? "automatic" : "manual";
                    void action(async (signal) => {
                      const next = await api.mode(mode, signal);
                      setStatus(next);
                      setMessage(
                        mode === "automatic"
                          ? "Automatic issue creation enabled for newly confirmed feedback."
                          : "Manual issue review enabled.",
                      );
                    });
                  }}
                >
                  <option value="manual">Manual: review each issue</option>
                  <option value="automatic">Automatic: create after feedback confirmation</option>
                </select>
              </div>
              {status.issueMode === "automatic" && (
                <p className="muted">
                  Newly confirmed feedback is sent to {status.connection.fullName} without another
                  maintainer review. Existing pending exports may still finish after this mode is
                  changed or GitHub is disconnected.
                </p>
              )}
            </>
          )}
          <div className="github-actions">
            {status.installUrl && (
              <a
                className="studio-button"
                href={status.installUrl}
                target="_blank"
                rel="noreferrer"
              >
                Install or manage GitHub App ↗
              </a>
            )}
            <button
              type="button"
              className="studio-button"
              disabled={busy}
              onClick={() =>
                void action(async (signal) => {
                  const result = await api.connect(signal);
                  window.location.assign(result.url);
                })
              }
            >
              {status.authorized ? "Reauthorize GitHub" : "Connect GitHub"}
            </button>
          </div>
          <p className="muted">
            Install the app on selected repositories, then authorize access here. Authorization
            lasts up to eight hours; reconnect when it expires.
          </p>
          {status.authorized && (
            <>
              <div className="studio-setting">
                <label htmlFor="github-installation">
                  GitHub account<span>Choose an app installation you can access.</span>
                </label>
                <select
                  id="github-installation"
                  className="studio-input"
                  value={installationId}
                  disabled={busy}
                  onChange={(event) => {
                    const id = event.target.value;
                    setInstallationId(id);
                    setRepositoryId("");
                    setRepositories([]);
                    setRepositoryPage(null);
                    if (id)
                      void action(async (signal) => {
                        const result = await api.repositories(id, 1, signal);
                        setRepositories(result.repositories);
                        setRepositoryPage(result.nextPage);
                      });
                  }}
                >
                  <option value="">Select account</option>
                  {installations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.login}
                    </option>
                  ))}
                </select>
              </div>
              {installations.length === 0 && !busy && (
                <p>
                  No eligible installation found. Install the app with issue write permission, then
                  refresh this page.
                </p>
              )}
              {installationPage && (
                <button
                  type="button"
                  className="studio-button"
                  disabled={busy}
                  onClick={() =>
                    void action(async (signal) => {
                      const list = await api.installations(installationPage, signal);
                      setInstallations((previous) => [...previous, ...list.installations]);
                      setInstallationPage(list.nextPage);
                    })
                  }
                >
                  Load more accounts
                </button>
              )}
              {installationId && (
                <div className="studio-setting">
                  <label htmlFor="github-repository">
                    GitHub repository<span>You need write access and enabled issues.</span>
                  </label>
                  <select
                    id="github-repository"
                    className="studio-input"
                    value={repositoryId}
                    disabled={busy}
                    onChange={(event) => setRepositoryId(event.target.value)}
                  >
                    <option value="">Select repository</option>
                    {repositories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.fullName} ({item.isPrivate ? "private" : "public"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {repositoryPage && (
                <button
                  type="button"
                  className="studio-button"
                  disabled={busy}
                  onClick={() =>
                    void action(async (signal) => {
                      const list = await api.repositories(installationId, repositoryPage, signal);
                      setRepositories((previous) => [...previous, ...list.repositories]);
                      setRepositoryPage(list.nextPage);
                    })
                  }
                >
                  Load more repositories
                </button>
              )}
              <button
                type="button"
                className="studio-button studio-button-primary"
                disabled={busy || !repositoryId || !installationId}
                onClick={() =>
                  void action(async (signal) => {
                    setStatus(await api.bind(installationId, repositoryId, signal));
                    setMessage(
                      "Repository connected. Reports are exported only after your approval.",
                    );
                  })
                }
              >
                Save repository connection
              </button>
            </>
          )}
          {(status.connection || status.authorized) && (
            <div>
              {disconnecting ? (
                <>
                  <p>
                    Disconnecting removes Filika’s stored authorization. Existing GitHub issues
                    remain. A previously confirmed request may already be in progress.
                  </p>
                  <div className="github-actions">
                    <button
                      type="button"
                      className="studio-button"
                      disabled={busy}
                      onClick={() =>
                        void action(async (signal) => {
                          await api.disconnect(signal);
                          setStatus(await api.status(signal));
                          setInstallations([]);
                          setRepositories([]);
                          setInstallationId("");
                          setRepositoryId("");
                          setDisconnecting(false);
                          setMessage("GitHub disconnected.");
                        })
                      }
                    >
                      Confirm disconnect
                    </button>
                    <button
                      type="button"
                      className="studio-button"
                      disabled={busy}
                      onClick={() => setDisconnecting(false)}
                    >
                      Cancel disconnect
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="studio-button"
                  disabled={busy}
                  onClick={() => setDisconnecting(true)}
                >
                  Disconnect GitHub
                </button>
              )}
            </div>
          )}
        </>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
