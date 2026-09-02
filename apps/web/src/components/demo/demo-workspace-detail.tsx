"use client";

import { useEffect, useRef, useState } from "react";
import type { InboxDetailViewModel } from "@/contracts/inbox-view-model";
import { demoApi } from "@/services/demo-api";
import { InboxDetailReady, InboxStatePanel } from "@/workspace/inbox-view";
import styles from "./demo-workspace.module.css";

const DEVICE_KEY_STORAGE = "filika-demo-device-v1";

function deviceKey(): string {
  const existing = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (existing !== null && /^[a-z0-9-]{8,64}$/.test(existing)) return existing;
  const key = crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem(DEVICE_KEY_STORAGE, key);
  return key;
}

export function DemoWorkspaceDetail({ feedbackId }: { feedbackId: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { feedback: InboxDetailViewModel; status: "ready" }
  >({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly retries the request.
  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    demoApi(deviceKey())
      .inbox.fetchDetail(feedbackId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.status === "ready") {
          setState({ feedback: result.feedback, status: "ready" });
        } else {
          setState({ status: "error" });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [feedbackId, attempt]);

  return (
    <main className={styles.workspace} id="app-content">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Filika demo workspace</span>
          <h1>Complaint details</h1>
        </div>
        <a className={styles.primaryLink} href="/demo/workspace">
          Back to complaints
        </a>
      </header>

      {state.status === "loading" ? (
        <InboxStatePanel role="status" state="loading" heading="Loading" body="Loading feedback…" />
      ) : state.status === "error" ? (
        <InboxStatePanel
          role="alert"
          state="error"
          heading="Unable to load feedback"
          body="Feedback could not be loaded. Try again."
        >
          <button
            className="studio-button"
            type="button"
            onClick={() => {
              controllerRef.current?.abort();
              setState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </InboxStatePanel>
      ) : (
        <>
          <InboxDetailReady feedback={state.feedback} />
          <p className={styles.muted} style={{ marginTop: 24 }}>
            GitHub: when a repository is connected to a Filika application, a report like this can
            be exported as an issue automatically.
          </p>
        </>
      )}
    </main>
  );
}
