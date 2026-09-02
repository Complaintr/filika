"use client";

import { Check, Circle, RotateCcw } from "lucide-react";
import styles from "./demo.module.css";
import type { DemoStoreState } from "./demo-store";

export interface DemoFlowPanelProps {
  sdkReady: boolean;
  promptCopied: boolean;
  storeState: DemoStoreState;
  feedbackReceived: boolean;
  onReset(): void;
}

interface LiveEvent {
  label: string;
  complete: boolean;
}

export function DemoFlowPanel({
  sdkReady,
  promptCopied,
  storeState,
  feedbackReceived,
  onReset,
}: DemoFlowPanelProps) {
  const events: readonly LiveEvent[] = [
    { label: "Filika tool ready", complete: sdkReady },
    { label: "Product added", complete: storeState.cart.length > 0 },
    { label: "Checkout failed", complete: storeState.stuck },
    { label: "Feedback received", complete: feedbackReceived },
  ];
  const currentIndex = events.findIndex((event) => !event.complete);
  const status = feedbackReceived
    ? "Feedback received"
    : storeState.stuck
      ? "Waiting for the agent to report"
      : storeState.cart.length > 0
        ? "Agent is checking out"
        : "Waiting for your agent";

  return (
    <aside className={styles.flowPanel} aria-label="Live demo status">
      <header className={styles.liveHeader}>
        <span className={styles.liveLabel}>
          <i aria-hidden="true" /> Live demo
        </span>
        <h2>{status}</h2>
      </header>

      <ol className={styles.liveEvents} aria-label="Demo activity">
        {events.map((event, index) => {
          const current = index === currentIndex;
          return (
            <li
              key={event.label}
              className={`${event.complete ? styles.liveEventComplete : ""} ${current ? styles.liveEventCurrent : ""}`}
            >
              <span className={styles.liveEventIcon} aria-hidden="true">
                {event.complete ? <Check /> : <Circle />}
              </span>
              <span>{event.label}</span>
              <small>{event.complete ? "Done" : current ? "Waiting" : "Pending"}</small>
            </li>
          );
        })}
      </ol>

      <div className={styles.liveHint}>
        <strong>{promptCopied ? "Prompt copied" : "Run it with your browser agent"}</strong>
        <p>
          {promptCopied
            ? "Paste the prompt into your agent and let it use the page."
            : "Copy the prompt, open your agent, and let it complete the task."}
        </p>
      </div>

      <footer className={styles.liveFooter}>
        <button className={styles.resetButton} type="button" onClick={onReset}>
          <RotateCcw aria-hidden="true" /> Reset demo
        </button>
      </footer>
    </aside>
  );
}
