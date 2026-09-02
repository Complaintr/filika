"use client";

import { type DriveStep, driver } from "driver.js";
import "driver.js/dist/driver.css";
import { createSdk } from "@filika/sdk";
import { useEffect, useRef, useState } from "react";
import { ReceiptToast } from "@/components/receipt-toast";
import { connectSdkDialog } from "@/sdk-dialog";
import { demoApi } from "@/services/demo-api";
import styles from "./demo.module.css";
import { DEMO_AGENT_LOG, DEMO_DRAFT, DEMO_STEPS, TEST_DEMO_PROMPT } from "./demo-data";
import { DemoFlowPanel } from "./demo-flow-panel";
import { DemoStore, type DemoStoreState } from "./demo-store";

const DEVICE_KEY_STORAGE = "filika-demo-device-v1";

function deviceKey(): string {
  const existing = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (existing !== null && /^[a-z0-9-]{8,64}$/.test(existing)) return existing;
  const key = crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem(DEVICE_KEY_STORAGE, key);
  return key;
}

export function DemoExperience() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const [projectKey, setProjectKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [guideIndex, setGuideIndex] = useState(0);
  const [panelHidden, setPanelHidden] = useState(false);
  const [storeState, setStoreState] = useState<DemoStoreState>({
    cart: [],
    orderPlaced: false,
    stuck: false,
  });
  const [receipt, setReceipt] = useState<{ feedbackId: string; receivedAt: string } | null>(null);

  // Create the driver spotlight once. The right-hand panel owns navigation;
  // driver.js only highlights the active step without blocking the page.
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .driver-active * { pointer-events: auto !important; }
      .driver-overlay, .driver-overlay * { pointer-events: none !important; }
      .driver-popover, .driver-popover * { pointer-events: auto !important; }
    `;
    document.head.append(style);
    const guide = driver({
      animate: true,
      showProgress: false,
      overlayOpacity: 0.14,
      stagePadding: 10,
      stageRadius: 10,
      smoothScroll: true,
      allowClose: false,
      showButtons: ["close"],
      skipMissingElement: true,
      steps: DEMO_STEPS.map(
        (step): DriveStep => ({
          element: step.target,
          popover: {
            title: step.title,
            description: step.description,
            side: "left",
            align: "center",
          },
        }),
      ),
    });
    driverRef.current = guide;
    guide.drive(0);
    return () => {
      guide.destroy();
      driverRef.current = null;
      style.remove();
    };
  }, []);

  // Move the spotlight to the active guide step without re-drawing from scratch.
  useEffect(() => {
    const guide = driverRef.current;
    if (guide === null || guideIndex < 0) return;
    if (guide.isActive()) {
      guide.moveTo(guideIndex);
    } else {
      guide.drive(guideIndex);
    }
  }, [guideIndex]);

  // Resolve the device demo project.
  useEffect(() => {
    const controller = new AbortController();
    demoApi(deviceKey())
      .fetchApplication(controller.signal)
      .then((app) => {
        if (!controller.signal.aborted) setProjectKey(app.projectKey);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("The Filika demo could not start.");
      });
    return () => controller.abort();
  }, []);

  // Initialize the real SDK + review dialog once the project key is known.
  useEffect(() => {
    if (projectKey === null || hostRef.current === null) return;
    const api = createSdk({
      document,
      development: window.location.protocol === "http:",
    });
    const integration = connectSdkDialog(hostRef.current, api, {
      onReceipt(view) {
        setReceipt({ feedbackId: view.feedbackId, receivedAt: view.receivedAt });
      },
    });
    void api.init({
      projectKey,
      endpoint: `${window.location.origin}/api/v1/feedback`,
      routeLabel: "/demo/checkout",
    });
    return () => integration.dispose();
  }, [projectKey]);

  function reset() {
    setStoreState({ cart: [], orderPlaced: false, stuck: false });
    setReceipt(null);
    setError("");
    setGuideIndex(0);
  }

  // Advance the storefront to match the guided tour: the agent adds the
  // headphones at the product step so the checkout becomes visible. Placing
  // the order stays a real interaction (user or agent) that triggers the 504.
  useEffect(() => {
    const productIndex = DEMO_STEPS.findIndex((step) => step.id === "product");
    setStoreState((current) =>
      guideIndex >= productIndex && current.cart.length === 0
        ? { ...current, cart: ["headphones"] }
        : current,
    );
  }, [guideIndex]);

  const activeStep = DEMO_STEPS[guideIndex];

  return (
    <div className={styles.experience} data-demo-experience>
      <div className={styles.experienceMain}>
        <header className={styles.demoHeader}>
          <div>
            <span className={styles.demoEyebrow}>Filika demo store</span>
            <h1>Test Filika with your AI agent</h1>
          </div>
          <span className={styles.demoBadge}>
            <i aria-hidden="true" /> WebMCP ready
          </span>
        </header>

        <section className={styles.promptCard} id="demo-prompt" data-demo-step="prompt">
          <div>
            <span className={styles.demoEyebrow}>Your test prompt</span>
            <p className={styles.promptText}>“{TEST_DEMO_PROMPT}”</p>
          </div>
          <button
            className={styles.copyButton}
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(TEST_DEMO_PROMPT).catch(() => {});
            }}
          >
            Copy prompt
          </button>
        </section>

        <DemoStore state={storeState} onChange={setStoreState} />

        <section className={styles.agentReport} id="demo-report" data-demo-step="report">
          <header>
            <span className={styles.demoEyebrow}>Agent report</span>
            <h2>{DEMO_DRAFT.title}</h2>
          </header>
          <ol className={styles.agentLog} aria-label="Agent activity">
            {DEMO_AGENT_LOG.map((entry) => (
              <li key={entry.text}>
                <span>{entry.tag}</span>
                {entry.text}
              </li>
            ))}
          </ol>
          <div className={styles.agentDraft}>
            <strong>{DEMO_DRAFT.title}</strong>
            <p>{DEMO_DRAFT.description}</p>
            <p className={styles.muted}>{DEMO_DRAFT.expectedBehavior}</p>
          </div>
        </section>

        <div ref={hostRef} data-demo-step="review" id="demo-review" />

        <section className={styles.result} id="demo-result" data-demo-step="result">
          {receipt ? (
            <>
              <span className={styles.resultMark} aria-hidden="true">
                ✓
              </span>
              <h2>A problem was found — a complaint has arrived.</h2>
              <p>
                The report reached the Filika demo inbox for this device
                {receipt.feedbackId ? ` (${receipt.feedbackId.slice(0, 8)}…)` : ""}.
              </p>
              <div className={styles.resultActions}>
                <a className={styles.primaryLink} href="/demo/workspace">
                  Open the demo inbox
                </a>
                <a className={styles.accountCta} href="/register">
                  Create an account to keep this report
                </a>
              </div>
              <p className={styles.githubNote}>
                When you connect a repository, this report can become a GitHub issue automatically.
              </p>
            </>
          ) : (
            <p className={styles.resultWaiting} role="status">
              Waiting for a report from your agent…
            </p>
          )}
        </section>
      </div>

      <DemoFlowPanel
        activeIndex={guideIndex}
        hidden={panelHidden}
        onNavigate={setGuideIndex}
        onReset={reset}
        onToggleHidden={() => setPanelHidden((value) => !value)}
      />

      {activeStep ? (
        <p className={styles.srOnly} role="status">
          {activeStep.title}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div ref={toastRef} />
      {receipt ? <ReceiptToastHost receipt={receipt} /> : null}
    </div>
  );
}

function ReceiptToastHost({ receipt }: { receipt: { feedbackId: string; receivedAt: string } }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current === null) return;
    const toast = new ReceiptToast(ref.current, {
      onViewInbox: () => {
        window.location.assign("/demo/workspace");
      },
    });
    toast.show({
      feedbackId: receipt.feedbackId,
      receivedAt: receipt.receivedAt,
      duplicate: false,
    });
    return () => toast.dismiss();
  }, [receipt]);
  return <div ref={ref} />;
}
