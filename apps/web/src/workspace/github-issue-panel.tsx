"use client";

import type { IssuePreview } from "@filika/collector/github/contracts";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { githubApi } from "@/services/github-api";

export function GitHubIssuePanel({ appSlug, feedbackId }: { appSlug: string; feedbackId: string }) {
  const [data, setData] = useState<IssuePreview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const id = useId();
  const api = githubApi(appSlug);

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    setData(null);
    setReviewing(false);
    setError("");
    setBusy(true);
    setNeedsRefresh(false);
    void githubApi(appSlug)
      .preview(feedbackId, request.signal)
      .then((value) => {
        if (!request.signal.aborted) {
          setData(value);
          setTitle(value.draft.title);
          setBody(value.draft.body);
        }
      })
      .catch((err: unknown) => {
        if (!request.signal.aborted)
          setError(err instanceof Error ? err.message : "Could not load GitHub status.");
      })
      .finally(() => {
        if (!request.signal.aborted) setBusy(false);
      });
    return () => request.abort();
  }, [appSlug, feedbackId]);
  useEffect(() => () => controller.current?.abort(), []);

  async function action(work: (signal: AbortSignal) => Promise<void>) {
    if (busy) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    try {
      await work(request.signal);
    } catch (err) {
      if (!request.signal.aborted) {
        setError(err instanceof Error ? err.message : "Could not complete the request.");
        setNeedsRefresh(true);
      }
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }

  const issue = data?.issue;
  const canCreate =
    data?.configured &&
    data.authorized &&
    data.connection?.active &&
    (!issue || issue.status === "failed") &&
    !needsRefresh;
  return (
    <section className="github-issue-panel" aria-labelledby={`${id}-heading`} aria-busy={busy}>
      <h3 id={`${id}-heading`}>GitHub issue</h3>
      {issue?.status === "created" && issue.url ? (
        <>
          <p>
            <a href={issue.url} target="_blank" rel="noreferrer">
              View {issue.fullName} #{issue.number} ↗
            </a>
          </p>
          <p>Created {issue.trigger === "automatic" ? "automatically" : "after manual review"}.</p>
        </>
      ) : (
        <>
          {!data && !error && <p role="status">Loading GitHub status…</p>}
          {data && !canCreate && (!issue || issue.status === "failed") && (
            <p>
              <Link href={`/${appSlug}/settings?github=settings`}>
                Configure or reconnect GitHub
              </Link>{" "}
              to export this report. Only the application owner can approve an export.
            </p>
          )}
          {(issue?.status === "pending" || issue?.status === "uncertain") && (
            <>
              <p role="status">
                {issue.status === "pending"
                  ? "Issue creation is in progress."
                  : "The result is uncertain. Filika will check GitHub without creating another issue."}
              </p>
              <button
                className="studio-button"
                type="button"
                disabled={busy}
                onClick={() =>
                  void action(async (signal) => {
                    const result = await api.reconcile(feedbackId, signal);
                    setData((previous) =>
                      previous ? { ...previous, issue: result.issue } : previous,
                    );
                  })
                }
              >
                Check GitHub result
              </button>
            </>
          )}
          {issue?.status === "failed" && (
            <p>
              GitHub rejected the previous {issue.trigger} request. Review the issue before trying
              again.
            </p>
          )}
          {data?.issueMode === "automatic" && !issue && (
            <p>
              Automatic issue creation has not completed. Refresh the status or create this issue
              manually.
            </p>
          )}
          {canCreate && !reviewing && (
            <button
              type="button"
              className="studio-button"
              disabled={busy}
              onClick={() => setReviewing(true)}
            >
              {data?.issueMode === "automatic" ? "Create manually" : "Create GitHub issue"}
            </button>
          )}
          {canCreate && reviewing && data.connection && (
            <div className="github-issue-review">
              <p>
                <strong>Destination: {data.connection.fullName}</strong> ·{" "}
                {data.connection.isPrivate
                  ? "Private repository"
                  : "Public repository: anyone can read this issue"}
              </p>
              <p>
                Review the full content before sending it to GitHub. Remove personal data,
                credentials and unwanted mentions or links. Issues remain on GitHub after the Filika
                report expires. Filika adds a tracking marker to prevent duplicate exports.
              </p>
              <label htmlFor={`${id}-title`}>Issue title</label>
              <input
                id={`${id}-title`}
                className="studio-input"
                value={title}
                maxLength={160}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
              />
              <label htmlFor={`${id}-body`}>Issue description (Markdown)</label>
              <textarea
                id={`${id}-body`}
                className="studio-input"
                value={body}
                maxLength={12000}
                rows={12}
                disabled={busy}
                onChange={(event) => setBody(event.target.value)}
              />
              <div className="github-actions">
                <button
                  type="button"
                  className="studio-button studio-button-primary"
                  disabled={busy || !title.trim() || !body.trim()}
                  onClick={() =>
                    void action(async (signal) => {
                      if (!data.connection) return;
                      const result = await api.create(
                        feedbackId,
                        {
                          connectionVersion: data.connection.version,
                          fullName: data.connection.fullName,
                          isPrivate: data.connection.isPrivate,
                          title,
                          body,
                        },
                        signal,
                      );
                      setData((previous) =>
                        previous ? { ...previous, issue: result.issue } : previous,
                      );
                      setReviewing(false);
                    })
                  }
                >
                  {busy ? "Sending…" : "Confirm and create issue"}
                </button>
                <button
                  type="button"
                  className="studio-button"
                  disabled={busy}
                  onClick={() => {
                    setReviewing(false);
                    setTitle(data.draft.title);
                    setBody(data.draft.body);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <p role="alert">{error}</p>
      {(error || needsRefresh || issue?.status === "pending") && (
        <button
          type="button"
          className="studio-button"
          disabled={busy}
          onClick={() =>
            void action(async (signal) => {
              const value = await api.preview(feedbackId, signal);
              setData(value);
              setNeedsRefresh(false);
              setReviewing(false);
            })
          }
        >
          Refresh GitHub status
        </button>
      )}
    </section>
  );
}
