"use client";

import { ArrowLeft, ArrowRight, Copy, ExternalLink, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { InboxDetailViewState } from "@/contracts/inbox-view-model";
import { InboxApiService } from "@/services/inbox-api";
import { formatDate, kindLabels } from "./dom";
import { GitHubIssuePanel } from "./github-issue-panel";
import { InboxDetailState } from "./inbox-view";

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ComplaintDialog({
  appSlug,
  feedbackId,
  onClose,
  previousId,
  nextId,
  onNavigate,
}: {
  appSlug: string;
  feedbackId: string;
  onClose: () => void;
  previousId?: string | undefined;
  nextId?: string | undefined;
  onNavigate: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<InboxDetailViewState>({ status: "loading" });
  const requestRef = useRef<AbortController | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    const node = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    node?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node?.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const load = useCallback(() => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ status: "loading" });
    setCopyStatus("");
    const api = new InboxApiService({ collectorOrigin: "", appSlug });
    api.fetchDetail(feedbackId, controller.signal).then((result) => {
      if (!controller.signal.aborted) setState(result);
    });
  }, [feedbackId, appSlug]);

  useEffect(() => {
    load();
    return () => requestRef.current?.abort();
  }, [load]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${appSlug}/complaints/${encodeURIComponent(feedbackId)}`,
      );
      setCopyStatus("Link copied");
    } catch {
      setCopyStatus("Could not copy the link");
    }
  }

  const ready = state.status === "ready";

  return (
    <dialog
      ref={dialog}
      className="report-dialog analytics-surface"
      aria-labelledby="report-heading"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <div className="analytics-surface-heading report-dialog-head">
        <div className="report-dialog-heading">
          <h2 id="report-heading">{ready ? "Report content" : "Feedback details"}</h2>
          {ready && <span>{kindLabels[state.feedback.kind]}</span>}
        </div>
        <div className="report-dialog-actions">
          <button
            className="report-ghost-button"
            type="button"
            aria-label="Previous report"
            disabled={!previousId}
            onClick={() => previousId && onNavigate(previousId)}
          >
            <ArrowLeft />
          </button>
          <button
            className="report-ghost-button"
            type="button"
            aria-label="Next report"
            disabled={!nextId}
            onClick={() => nextId && onNavigate(nextId)}
          >
            <ArrowRight />
          </button>
          <button
            className="report-ghost-button"
            type="button"
            aria-label="Close report"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
      </div>
      <div className="analytics-inset report-dialog-inset" aria-busy={!ready}>
        {ready ? (
          <>
            <div className="report-dialog-title">
              <h2 tabIndex={-1}>{state.feedback.title}</h2>
              <p className="muted">
                Received {formatDate(state.feedback.receivedAt)} ·{" "}
                {state.feedback.routeLabel || "No page label"}
              </p>
            </div>
            <div className="report-sections" data-untrusted="true">
              <section className="report-section">
                <h3>What happened</h3>
                <p>{state.feedback.description}</p>
              </section>
              {state.feedback.expectedBehavior && (
                <section className="report-section">
                  <h3>What was expected</h3>
                  <p>{state.feedback.expectedBehavior}</p>
                </section>
              )}
              {state.feedback.reproductionSteps && (
                <section className="report-section">
                  <h3>Steps to reproduce</h3>
                  <p>{state.feedback.reproductionSteps}</p>
                </section>
              )}
              <section className="report-section">
                <h3>Report context</h3>
                <dl className="report-context-grid">
                  <DetailValue label="Origin" value={state.feedback.requestOrigin} />
                  <DetailValue label="Page" value={state.feedback.routeLabel || "Not provided"} />
                  <DetailValue
                    label="Release"
                    value={state.feedback.applicationRelease || "Not provided"}
                  />
                  <DetailValue
                    label="Received"
                    value={new Date(state.feedback.receivedAt).toLocaleString("en")}
                  />
                  <DetailValue
                    label="Available until"
                    value={new Date(state.feedback.expiresAt).toLocaleString("en")}
                  />
                  <div>
                    <dt>Report ID</dt>
                    <dd className="report-id">{state.feedback.feedbackId}</dd>
                  </div>
                </dl>
              </section>
            </div>
            <GitHubIssuePanel
              key={`${appSlug}:${feedbackId}`}
              appSlug={appSlug}
              feedbackId={feedbackId}
            />
          </>
        ) : (
          <div className="report-state">
            <InboxDetailState state={state} />
            {state.status === "error" && (
              <button type="button" className="studio-button" onClick={load}>
                Try again
              </button>
            )}
          </div>
        )}
      </div>
      <footer className="report-dialog-footer">
        <span>
          <ShieldCheck /> Read-only feedback. External content is untrusted.
        </span>
        <div>
          <span role="status">{copyStatus}</span>
          <button className="studio-button" type="button" onClick={() => void copyLink()}>
            <Copy /> Copy link
          </button>
          <Link
            className="studio-icon-button"
            aria-label="Open report page"
            href={`/${appSlug}/complaints/${encodeURIComponent(feedbackId)}`}
          >
            <ExternalLink />
          </Link>
        </div>
      </footer>
    </dialog>
  );
}
