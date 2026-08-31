"use client";

import { use, useEffect, useState } from "react";
import type { InboxDetailViewState } from "@/contracts/inbox-view-model";
import { InboxApiService } from "@/services/inbox-api";
import { GitHubIssuePanel } from "@/workspace/github-issue-panel";
import { InboxDetailShell, InboxDetailState } from "@/workspace/inbox-view";

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ appSlug: string; feedbackId: string }>;
}) {
  const { appSlug, feedbackId } = use(params);
  const [state, setState] = useState<InboxDetailViewState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const api = new InboxApiService({ collectorOrigin: "", appSlug });
    api.fetchDetail(feedbackId, controller.signal).then((value) => {
      if (!controller.signal.aborted) setState(value);
    });
    return () => controller.abort();
  }, [appSlug, feedbackId]);

  return (
    <InboxDetailShell
      complaintsHref={`/${appSlug}/complaints`}
      kind={state.status === "ready" ? state.feedback.kind : undefined}
    >
      {state.status === "ready" ? (
        <>
          <h1>{state.feedback.title}</h1>
          <InboxDetailState state={state} />
          <GitHubIssuePanel
            key={`${appSlug}:${feedbackId}`}
            appSlug={appSlug}
            feedbackId={feedbackId}
          />
        </>
      ) : (
        <>
          <h1>Complaint details</h1>
          <InboxDetailState state={state} />
        </>
      )}
    </InboxDetailShell>
  );
}
