"use client";

import { useEffect, useRef, useState } from "react";
import { demoApi } from "@/services/demo-api";
import { InboxStatePanel } from "@/workspace/inbox-view";
import styles from "./demo-workspace.module.css";

const DEVICE_KEY_STORAGE = "filika-demo-device-v1";

function deviceKey(): string {
  const existing = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (existing !== null && /^[a-z0-9-]{8,64}$/.test(existing)) return existing;
  const key = crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem(DEVICE_KEY_STORAGE, key);
  return key;
}

export function DemoWorkspaceList() {
  const [state, setState] = useState<"loading" | "empty" | "ready" | "error">("loading");
  const [items, setItems] = useState<
    readonly { feedbackId: string; kind: string; title: string; receivedAt: string }[]
  >([]);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    demoApi(deviceKey())
      .inbox.fetchList(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.status === "ready") {
          setItems(result.items);
          setState("ready");
        } else if (result.status === "empty") {
          setItems([]);
          setState("empty");
        } else {
          setState("error");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, []);

  return (
    <main className={styles.workspace} id="app-content">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Filika demo</span>
          <h1>Complaints for this browser</h1>
          <p className={styles.muted}>
            Reports sent from the demo store in this browser appear here. Demo feedback is retained
            for 24 hours.
          </p>
        </div>
        <a className={styles.primaryLink} href="/demo">
          Back to the demo store
        </a>
      </header>

      {state === "loading" ? (
        <InboxStatePanel role="status" state="loading" heading="Loading" body="Loading feedback…" />
      ) : state === "error" ? (
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
              setState("loading");
              const controller = new AbortController();
              controllerRef.current = controller;
              demoApi(deviceKey())
                .inbox.fetchList(controller.signal)
                .then((result) => {
                  if (result.status === "ready") {
                    setItems(result.items);
                    setState("ready");
                  } else if (result.status === "empty") {
                    setState("empty");
                  } else {
                    setState("error");
                  }
                })
                .catch(() => setState("error"));
            }}
          >
            Try again
          </button>
        </InboxStatePanel>
      ) : state === "empty" ? (
        <InboxStatePanel
          role="status"
          state="empty"
          heading="No feedback yet"
          body="Once your agent sends a reviewed report from the demo store, it will appear here."
        />
      ) : (
        <ol className={styles.list} aria-label="Demo complaints">
          {items.map((item) => (
            <li key={item.feedbackId}>
              <a className={styles.row} href={`/demo/workspace/${item.feedbackId}`}>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.kind.replaceAll("_", " ")} ·{" "}
                    {new Date(item.receivedAt).toLocaleString("en")}
                  </small>
                </span>
                <span aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
