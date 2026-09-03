"use client";

import { createSdk, type ReviewRequest } from "@filika/sdk";
import { ArrowLeft, ArrowRight, Bot, Check, Copy, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FilikaBrand } from "@/components/filika-brand";
import { ReceiptToast } from "@/components/receipt-toast";
import { demoApi } from "@/services/demo-api";
import styles from "./demo.module.css";
import { DEMO_PRODUCTS, demoPrompt } from "./demo-data";
import { DemoFlowPanel } from "./demo-flow-panel";
import { DemoStore, type DemoStoreState } from "./demo-store";
import {
  type DemoStoreTools,
  demoCheckoutFailureText,
  registerDemoStoreTools,
} from "./demo-store-webmcp";

const DEVICE_KEY_STORAGE = "filika-demo-device-v1";
const DEMO_STATE_STORAGE = "filika-demo-store-state-v1";
const DEMO_RECEIPT_STORAGE = "filika-demo-receipt-v1";

const EMPTY_STORE_STATE: DemoStoreState = { cart: [], orderPlaced: false, stuck: false };

function loadStoreState(): DemoStoreState {
  try {
    const raw = localStorage.getItem(DEMO_STATE_STORAGE);
    if (raw === null) return EMPTY_STORE_STATE;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      Array.isArray((value as { cart?: unknown }).cart) &&
      typeof (value as { orderPlaced?: unknown }).orderPlaced === "boolean" &&
      typeof (value as { stuck?: unknown }).stuck === "boolean"
    ) {
      return {
        cart: (value as { cart: string[] }).cart.filter((id) =>
          DEMO_PRODUCTS.some((product) => product.id === id),
        ),
        orderPlaced: (value as { orderPlaced: boolean }).orderPlaced,
        stuck: (value as { stuck: boolean }).stuck,
      };
    }
    return EMPTY_STORE_STATE;
  } catch {
    return EMPTY_STORE_STATE;
  }
}

function saveStoreState(state: DemoStoreState): void {
  try {
    localStorage.setItem(DEMO_STATE_STORAGE, JSON.stringify(state));
  } catch {
    // Persistence failures must never break the demo.
  }
}

function loadReceipt(): { feedbackId: string; receivedAt: string } | null {
  try {
    const raw = localStorage.getItem(DEMO_RECEIPT_STORAGE);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      typeof (value as { feedbackId?: unknown }).feedbackId === "string" &&
      typeof (value as { receivedAt?: unknown }).receivedAt === "string"
    ) {
      return {
        feedbackId: (value as { feedbackId: string }).feedbackId,
        receivedAt: (value as { receivedAt: string }).receivedAt,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function deviceKey(): string {
  const existing = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (existing !== null && /^[a-z0-9-]{8,64}$/.test(existing)) return existing;
  const key = crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem(DEVICE_KEY_STORAGE, key);
  return key;
}

export function DemoExperience() {
  const [projectKey, setProjectKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  // Start empty so server and client hydration match; load the persisted
  // state in an effect after mount to avoid a hydration mismatch on the cart
  // count and receipt.
  const [storeState, setStoreState] = useState<DemoStoreState>(EMPTY_STORE_STATE);
  const [receipt, setReceipt] = useState<{ feedbackId: string; receivedAt: string } | null>(null);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setStoreState(loadStoreState());
  }, []);

  useEffect(() => {
    setReceipt(loadReceipt());
  }, []);

  // The store state is persisted per browser so navigating away and back to
  // the demo does not reset the agent's progress. Only "Reset demo" clears it.
  useEffect(() => {
    saveStoreState(storeState);
  }, [storeState]);

  useEffect(() => {
    if (receipt === null) {
      try {
        localStorage.removeItem(DEMO_RECEIPT_STORAGE);
      } catch {
        // Persistence failures must never break the demo.
      }
    } else {
      try {
        localStorage.setItem(DEMO_RECEIPT_STORAGE, JSON.stringify(receipt));
      } catch {
        // Persistence failures must never break the demo.
      }
    }
  }, [receipt]);

  // The WebMCP store tools read and write the same cart state as the visible
  // storefront, so agent actions update the live panel like human clicks.
  const storeStateRef = useRef(storeState);
  useEffect(() => {
    storeStateRef.current = storeState;
  }, [storeState]);

  const storeTools = useRef<DemoStoreTools>({
    addToCart(productId) {
      const current = storeStateRef.current;
      if (current.cart.length > 0) {
        return {
          ok: false,
          error: "The cart already contains an item. Reset the demo to start over.",
        };
      }
      if (!DEMO_PRODUCTS.some((product) => product.id === productId)) {
        return { ok: false, error: "Unknown product id." };
      }
      const next = { ...current, cart: [productId] };
      storeStateRef.current = next;
      setStoreState(next);
      return { ok: true };
    },
    async placeOrder(signal) {
      const current = storeStateRef.current;
      if (current.cart.length === 0) {
        return { ok: false, error: "The cart is empty. Add a product first." };
      }
      if (current.orderPlaced) {
        return {
          ok: false,
          error: "The order was already attempted. Reset the demo to try again.",
        };
      }
      const attempting = { ...current, orderPlaced: true, stuck: false };
      storeStateRef.current = attempting;
      setStoreState(attempting);
      try {
        const response = await fetch("/api/v1/demo/checkout", {
          method: "POST",
          signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
        });
        if (response.ok) return { ok: true };
      } catch {
        // Fall through to the deterministic demo failure.
      }
      const failed = { ...storeStateRef.current, stuck: true };
      storeStateRef.current = failed;
      setStoreState(failed);
      return { ok: false, error: demoCheckoutFailureText() };
    },
  });

  // Register the store's WebMCP shopping tools. Best effort: it must never
  // break the page when the browser or registration rejects it.
  useEffect(() => {
    const controller = new AbortController();
    void registerDemoStoreTools(document, controller, storeTools.current);
    return () => controller.abort();
  }, []);

  // The prompt carries the page address for the agent; it is only known after mount.
  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

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

  // Initialize the real SDK once the project key is known. Agent-authored
  // feedback is transmitted without a review dialog; the outcome updates the
  // demo result so the receipt appears when the collector accepts the report.
  useEffect(() => {
    if (projectKey === null) return;
    const controller = new AbortController();
    const api = createSdk({
      document,
      development: window.location.protocol === "http:",
      review: async (request: ReviewRequest) => {
        void request.outcome
          .then((result) => {
            if (controller.signal.aborted) return;
            if (result.code === "success") {
              setReceipt({
                feedbackId: result.receipt.feedbackId,
                receivedAt: result.receipt.receivedAt,
              });
            }
          })
          .catch(() => {});
        return { kind: "confirmed", feedback: request.draft, context: request.context };
      },
    });
    void api.init({
      projectKey,
      endpoint: `${window.location.origin}/api/v1/feedback`,
      routeLabel: "/demo/checkout",
    });
    return () => {
      controller.abort();
      api.dispose();
    };
  }, [projectKey]);

  const prompt = demoPrompt(pageUrl);

  function reset() {
    const next = { cart: [], orderPlaced: false, stuck: false };
    storeStateRef.current = next;
    setStoreState(next);
    saveStoreState(next);
    setReceipt(null);
    setError("");
    setPromptCopied(false);
    try {
      localStorage.removeItem(DEMO_RECEIPT_STORAGE);
    } catch {
      // Persistence failures must never break the demo.
    }
  }

  return (
    <div className={styles.experience} data-demo-experience>
      <header className={styles.demoHeader}>
        <div className={styles.demoHeaderInner}>
          <div className={styles.demoHeaderLeft}>
            <FilikaBrand href="/" label="Filika home" />
          </div>
          <div className={styles.demoHeaderActions}>
            <a className={styles.demoBackButton} href="/">
              <ArrowLeft aria-hidden="true" /> Back to Filika
            </a>
          </div>
        </div>
      </header>

      <div className={styles.experienceMain}>
        <section className={styles.demoIntro}>
          <h1>Try Filika on a broken checkout.</h1>
        </section>

        <section className={styles.promptCard} id="demo-prompt" data-demo-step="prompt">
          <span className={styles.promptIcon} aria-hidden="true">
            <Bot />
          </span>
          <div className={styles.promptContent}>
            <p className={styles.promptText}>A ready-made prompt for your browser agent.</p>
          </div>
          <button
            className={styles.copyButton}
            type="button"
            onClick={() => {
              void navigator.clipboard
                .writeText(prompt)
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
              <span>Waiting for your agent to report the checkout failure.</span>
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
