import { expect, test } from "bun:test";
import type { FilikaExecutionOutcome, FilikaModelContextTool } from "@filika/sdk";
import { createSdk } from "@filika/sdk";
import { Window } from "happy-dom";
import { connectSdkDialog } from "../src/sdk-dialog";

const draft = {
  kind: "bug",
  title: "Save failed",
  description: "The sample task failed.",
  reproductionSteps: ["Open task", "Save"],
};

async function fixture() {
  const window = new Window();
  const host = window.document.createElement("div");
  window.document.body.append(host);
  const requests: RequestInit[] = [];
  let tool: FilikaModelContextTool<FilikaExecutionOutcome> | undefined;
  const api = createSdk({
    document: {
      modelContext: {
        registerTool(value: FilikaModelContextTool<FilikaExecutionOutcome>) {
          tool = value;
        },
      },
    },
    development: true,
    review: (request) =>
      new Promise((resolve) => {
        // Happy DOM uses its own EventTarget realm; the browser suite covers the native bridge.
        const event = new window.CustomEvent("filika:review", {
          cancelable: true,
          detail: { request, complete: resolve },
        });
        window.document.dispatchEvent(event);
        if (!event.defaultPrevented) throw new Error("Unclaimed review");
      }),
    fetch: async (_url, init) => {
      requests.push(init);
      const envelope = JSON.parse(String(init.body));
      return Response.json(
        {
          schemaVersion: 1,
          eventId: envelope.eventId,
          feedbackId: "a0000000-0000-4000-8000-000000000001",
          receivedAt: "2026-08-28T10:00:00.000Z",
          duplicate: false,
        },
        { status: 201 },
      );
    },
  });
  const integration = connectSdkDialog(host, api);
  await api.init({
    projectKey: "filika-demo",
    endpoint: "http://localhost:8787/api/v1/feedback",
    routeLabel: "Sample task",
  });
  if (!tool) throw new Error("Tool not registered");
  const root = host.shadowRoot;
  if (!root) throw new Error("Dialog missing");
  return {
    api,
    tool,
    requests,
    integration,
    root,
    async close() {
      integration.dispose();
      await window.happyDOM.close();
    },
  };
}

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
function click(root: ShadowRoot, id: string) {
  const button = root.querySelector<HTMLButtonElement>(`#${id}`);
  if (!button) throw new Error(`Missing button ${id}`);
  button.click();
}

test("tool review edits and context removal reach the SDK transport only after confirmation", async () => {
  const f = await fixture();
  try {
    const result = f.tool.execute(draft, { signal: new AbortController().signal });
    await tick();
    expect(f.requests).toHaveLength(0);
    expect(f.root.textContent).toContain("Sample task");
    click(f.root, "filika-route-label-remove");
    click(f.root, "filika-review");
    expect(f.requests).toHaveLength(0);
    click(f.root, "filika-confirm");
    expect((await result).code).toBe("success");
    await tick();
    expect(f.root.textContent).toContain("Feedback received");
    const request = f.requests[0];
    const envelope = JSON.parse(String(request?.body));
    expect(envelope.feedback).toEqual(draft);
    expect(envelope.context).not.toHaveProperty("routeLabel");
    expect(request?.credentials).toBe("omit");
    expect(new Headers(request?.headers).get("Idempotency-Key")).toBe(envelope.eventId);
  } finally {
    await f.close();
  }
});

test("cancel and external abort during review never transmit", async () => {
  const f = await fixture();
  try {
    const result = f.api.open();
    await tick();
    click(f.root, "filika-cancel");
    expect(await result).toEqual({ code: "cancelled" });
    click(f.root, "filika-close");
    const controller = new AbortController();
    const aborted = f.tool.execute(draft, { signal: controller.signal });
    await tick();
    controller.abort();
    expect(await aborted).toEqual({ code: "aborted" });
    await tick();
    expect(f.root.textContent).toContain("Submission stopped");
    expect(f.requests).toHaveLength(0);
  } finally {
    await f.close();
  }
});
