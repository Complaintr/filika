"use client";

import { createSdk } from "@filika/sdk";
import { ArrowLeft, ArrowRight, Bot, Check, Copy, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FilikaBrand } from "@/components/filika-brand";
import { ReceiptToast } from "@/components/receipt-toast";
import { connectSdkDialog } from "@/sdk-dialog";
import { demoApi } from "@/services/demo-api";
import styles from "./demo.module.css";
import { TEST_DEMO_PROMPT } from "./demo-data";
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
  const [projectKey, setProjectKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const [storeState, setStoreState] = useState<DemoStoreState>({
    cart: [],
    orderPlaced: false,
    stuck: false,
  });
  const [receipt, setReceipt] = useState<{ feedbackId: string; receivedAt: string } | null>(null);

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
    setPromptCopied(false);
  }

  return (
    <div className={styles.experience} data-demo-experience>
      <div className={styles.experienceMain}>
        <header className={styles.demoHeader}>
          <div className={styles.demoHeaderBrand}>
            <FilikaBrand href="/" label="Filika home" />
            <span className={styles.demoHeaderDivider} aria-hidden="true" />
            <span>Interactive demo</span>
          </div>
          <div className={styles.demoHeaderActions}>
            <span className={styles.demoConnection}>
              <i aria-hidden="true" />
              <span>WebMCP</span>
              <small>Connected</small>
            </span>
            <a className={styles.backLink} href="/">
              <ArrowLeft aria-hidden="true" /> Back to Filika
            </a>
          </div>
        </header>

        <section className={styles.demoIntro}>
          <h1>Try Filika on a broken checkout.</h1>
        </section>

        <section className={styles.promptCard} id="demo-prompt" data-demo-step="prompt">
          <span className={styles.promptIcon} aria-hidden="true">
            <Bot />
          </span>
          <div className={styles.promptContent}>
            <p className={styles.promptText}>{TEST_DEMO_PROMPT}</p>
          </div>
          <button
            className={styles.copyButton}
            type="button"
            onClick={() => {
              void navigator.clipboard
                .writeText(TEST_DEMO_PROMPT)
                .then(() => {
                  setPromptCopied(true);
                  window.setTimeout(() => setPromptCopied(false), 1600);
                })
                .catch(() => {});
            }}
          >
            {promptCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {promptCopied ? "Copied" : "Copy prompt"}
          </button>
        </section>

        <DemoStore state={storeState} onChange={setStoreState} />

        <div ref={hostRef} data-demo-step="review" id="demo-review" />

        <section className={styles.result} id="demo-result" data-demo-step="result">
          {receipt ? (
            <>
              <span className={styles.resultMark} aria-hidden="true">
                <Check />
              </span>
              <h2>A problem was found. A complaint has arrived.</h2>
              <p>
                Report saved{receipt.feedbackId ? ` as ${receipt.feedbackId.slice(0, 8)}` : ""}.
              </p>
              <div className={styles.resultActions}>
                <a className={styles.primaryLink} href="/demo/workspace">
                  Open the demo inbox <ArrowRight aria-hidden="true" />
                </a>
              </div>
            </>
          ) : (
            <div className={styles.resultWaiting} role="status">
              <ShieldCheck aria-hidden="true" />
              <span>Nothing is sent without your approval.</span>
            </div>
          )}
        </section>
      </div>

      <DemoFlowPanel
        sdkReady={projectKey !== null}
        promptCopied={promptCopied}
        storeState={storeState}
        feedbackReceived={receipt !== null}
        onReset={reset}
      />
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
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
