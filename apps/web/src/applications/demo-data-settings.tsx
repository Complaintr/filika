"use client";

import { FlaskConical, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchDemoDataCount, removeDemoData, seedDemoData } from "@/services/demo-seed-api";

export function DemoDataSettings({ appSlug }: { appSlug: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    fetchDemoDataCount(appSlug, request.signal)
      .then((value) => {
        if (!request.signal.aborted) setCount(value);
      })
      .catch((error: unknown) => {
        if (!request.signal.aborted)
          setMessage(error instanceof Error ? error.message : "Could not load demo data.");
      });
    return () => request.abort();
  }, [appSlug]);

  async function action(work: (signal: AbortSignal) => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const request = new AbortController();
    controller.current = request;
    try {
      await work(request.signal);
    } catch (error) {
      if (!request.signal.aborted)
        setMessage(error instanceof Error ? error.message : "Demo data request failed.");
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }

  const canRemove = count !== null && count > 0;

  return (
    <div className="settings-section-body" aria-busy={busy}>
      <p>
        Add a batch of sample feedback so you can explore the dashboard and inbox without real
        reports. Every sample is marked and can be removed again from this section at any time.
      </p>
      <div className="settings-info-row">
        <div>
          <h3>Sample reports</h3>
          <p>{count === null ? "Loading…" : `${count.toLocaleString("en")} demo reports`}</p>
        </div>
        <button
          type="button"
          className="studio-button"
          disabled={busy}
          onClick={() =>
            void action(async (signal) => {
              const result = await seedDemoData(appSlug, signal);
              setCount(result.count);
              setMessage(
                result.created > 0
                  ? `${result.created.toLocaleString("en")} sample reports added.`
                  : "Sample data already exists. Remove it first to generate a fresh batch.",
              );
            })
          }
        >
          {busy ? <RefreshCw className="studio-spinning" /> : <FlaskConical />}
          {busy ? "Working…" : "Load demo data"}
        </button>
      </div>
      <div className="settings-info-row">
        <div>
          <h3>Remove demo data</h3>
          <p>
            Deletes every sample report for this application. Your real feedback stays untouched.
          </p>
        </div>
        {confirmingRemoval ? (
          <div className="github-actions">
            <button
              type="button"
              className="studio-button"
              disabled={busy}
              onClick={() =>
                void action(async (signal) => {
                  const deleted = await removeDemoData(appSlug, signal);
                  setCount(0);
                  setConfirmingRemoval(false);
                  setMessage(`${deleted.toLocaleString("en")} sample reports removed.`);
                })
              }
            >
              <Trash2 />
              Confirm removal
            </button>
            <button
              type="button"
              className="studio-button"
              disabled={busy}
              onClick={() => setConfirmingRemoval(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="studio-button"
            disabled={busy || !canRemove}
            onClick={() => setConfirmingRemoval(true)}
          >
            <Trash2 />
            Remove demo data
          </button>
        )}
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
