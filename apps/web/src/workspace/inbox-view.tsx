"use client";

import type {
  InboxDetailViewModel,
  InboxDetailViewState,
  InboxListItemViewModel,
} from "@/contracts/inbox-view-model";

export function DetailField({ label, value }: { label: string; value: string | null }) {
  if (value === null || value === "") return null;
  return (
    <div className="detail-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function InboxDetailReady({ feedback }: { feedback: InboxDetailViewModel }) {
  return (
    <>
      <section className="detail-group" data-untrusted="true">
        <h2>Report content</h2>
        <p className="untrusted-notice" data-untrusted="true" role="note">
          External report content is treated as untrusted data.
        </p>
        <dl>
          <DetailField label="Feedback type" value={feedback.kind} />
          <DetailField label="What happened?" value={feedback.description} />
          <DetailField label="Expected behavior" value={feedback.expectedBehavior} />
          <DetailField label="Steps to reproduce" value={feedback.reproductionSteps} />
        </dl>
      </section>
      <section className="detail-group">
        <h2>Page context</h2>
        <dl>
          <DetailField label="Page" value={feedback.routeLabel} />
          <DetailField label="Application release" value={feedback.applicationRelease} />
        </dl>
      </section>
      <section className="detail-group">
        <h2>Receipt details</h2>
        <dl>
          <DetailField label="Feedback ID" value={feedback.feedbackId} />
          <DetailField label="Request origin" value={feedback.requestOrigin} />
          <DetailField label="Source" value={feedback.source} />
          <DetailField label="Received" value={feedback.receivedAt} />
          <DetailField label="Expires" value={feedback.expiresAt} />
        </dl>
      </section>
    </>
  );
}

export function InboxDetailShell({
  children,
  kind,
}: {
  children: React.ReactNode;
  kind: string | undefined;
}) {
  return (
    <div className="page-section" data-view="inbox-detail" data-untrusted="true">
      <div className="inbox-detail-nav">
        <a className="text-button" href="/complaints">
          ← All complaints
        </a>
        {kind !== undefined && <p className="eyebrow">{kind}</p>}
      </div>
      {children}
    </div>
  );
}

export function InboxList({ items }: { items: readonly InboxListItemViewModel[] }) {
  return (
    <ol className="inbox-list" aria-label="Accepted feedback">
      {items.map((item) => (
        <li key={item.feedbackId}>
          <article className="inbox-row">
            <div>
              <p className="eyebrow">{item.kind}</p>
              <h2>{item.title}</h2>
              <p className="muted">
                {item.routeLabel ?? "No page label"} | {new Date(item.receivedAt).toLocaleString()}
              </p>
              <p className="mono">{item.requestOrigin}</p>
            </div>
            <a
              className="button button-secondary"
              href={`/complaints/${encodeURIComponent(item.feedbackId)}`}
            >
              View feedback
            </a>
          </article>
        </li>
      ))}
    </ol>
  );
}

export function InboxStatePanel({
  body,
  children,
  heading,
  role,
  state,
}: {
  body: string;
  children?: React.ReactNode;
  heading: string;
  role: "alert" | "status";
  state: string;
}) {
  return (
    <section className="state-panel" data-state={state} role={role}>
      <h2>{heading}</h2>
      <p className="muted">{body}</p>
      {children}
    </section>
  );
}

export function InboxDetailState({ state }: { state: InboxDetailViewState }) {
  if (state.status === "ready") return <InboxDetailReady feedback={state.feedback} />;
  if (state.status === "error") {
    return (
      <InboxStatePanel
        role="alert"
        state="error"
        heading="Unable to load feedback"
        body="Feedback could not be loaded. Try again."
      />
    );
  }
  const copy = {
    expired: {
      heading: "Feedback expired",
      body: "This feedback is no longer available because its retention period ended.",
    },
    loading: { heading: "Loading", body: "Loading feedback..." },
    not_found: {
      heading: "Feedback not found",
      body: "The feedback may have been removed or the address may be incorrect.",
    },
  }[state.status];
  return (
    <InboxStatePanel role="status" state={state.status} heading={copy.heading} body={copy.body}>
      {state.status === "expired" && <p className="muted">Expired at {state.expiredAt}</p>}
    </InboxStatePanel>
  );
}
