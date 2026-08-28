"use client";

import { use, useEffect, useState } from "react";
import type { InboxDetailViewState } from "@/contracts/inbox-view-model";
import { InboxApiService } from "@/services/inbox-api";
import { InboxDetailShell, InboxDetailState } from "@/workspace/inbox-view";

const api = new InboxApiService({ collectorOrigin: "" });

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ feedbackId: string }>;
}) {
  const { feedbackId } = use(params);
  const [state, setState] = useState<InboxDetailViewState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    api.fetchDetail(feedbackId, controller.signal).then(setState);
    return () => controller.abort();
  }, [feedbackId]);

  return (
    <InboxDetailShell kind={state.status === "ready" ? state.feedback.kind : undefined}>
      {state.status === "ready" ? (
        <>
          <h1>{state.feedback.title}</h1>
          <InboxDetailState state={state} />
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
