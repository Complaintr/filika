"use client";

import { Check, Circle, Loader2, RotateCcw } from "lucide-react";
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
        <h2>{status}</h2>
        <p className={styles.liveInstructions}>
          {promptCopied
            ? "Paste the prompt into your browser agent and let it complete the checkout. When it fails, the agent should report the problem through Filika."
            : "Copy the prompt, open your browser agent, and ask it to complete the checkout. The agent should report any failure through Filika."}
        </p>
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
                {event.complete ? <Check /> : current ? <Loader2 /> : <Circle />}
              </span>
              <span>{event.label}</span>
              <small>{event.complete ? "Done" : current ? "Waiting" : "Pending"}</small>
            </li>
          );
        })}
      </ol>

      <footer className={styles.liveFooter}>
        <p className={styles.liveAbout}>
          This is a live demo of Filika: a storefront whose checkout is deliberately broken, and an
          AI feedback tool that reports the failure. No report leaves this page without your
          explicit confirmation.
        </p>
        <button className={styles.resetButton} type="button" onClick={onReset}>
          <RotateCcw aria-hidden="true" /> Reset demo
        </button>
      </footer>
    </aside>
  );
}
