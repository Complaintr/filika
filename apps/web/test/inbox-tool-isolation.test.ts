import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { renderInboxDetail, renderInboxList } from "../src/components/inbox";

function setupDom() {
  const window = new Window({ url: "http://localhost:4173" });
  const document = window.document as unknown as Document;
  return { document, window };
}

describe("inbox untrusted data markings and tool isolation", () => {
  test("inbox list view has data-untrusted attribute set", () => {
    const { document } = setupDom();
    const section = renderInboxList(
      document,
      {
        items: [
          {
            feedbackId: "fb_untrusted_1",
            kind: "bug",
            receivedAt: "2026-08-28T12:00:00.000Z",
            requestOrigin: "http://localhost:4173",
            routeLabel: "Demo",
            title: "Untrusted report",
          },
        ],
        status: "ready",
      },
      { onOpen: () => {}, onRetry: () => {} },
    );

    expect(section.dataset.untrusted).toBe("true");
  });

  test("inbox detail view marks report content group as untrusted and renders advisory banner", () => {
    const { document } = setupDom();
    const section = renderInboxDetail(
      document,
      {
        feedback: {
          applicationRelease: "v1.0",
          description: "Detail desc",
          expectedBehavior: "Expected",
          expiresAt: "2026-08-29T12:00:00.000Z",
          feedbackId: "fb_untrusted_2",
          kind: "bug",
          receivedAt: "2026-08-28T12:00:00.000Z",
          reproductionSteps: "Steps",
          requestOrigin: "http://localhost:4173",
          routeLabel: "Demo",
          source: "web_sdk_unverified",
          title: "Untrusted report title",
        },
        status: "ready",
      },
      { onBack: () => {}, onRetry: () => {} },
    );

    expect(section.dataset.untrusted).toBe("true");

    const reportGroup = section.querySelector("section.detail-group[data-untrusted='true']");
    expect(reportGroup).not.toBeNull();
    expect(reportGroup?.querySelector("h2")?.textContent).toBe("Report content");

    const notice = reportGroup?.querySelector(".untrusted-notice");
    expect(notice).not.toBeNull();
    expect(notice?.getAttribute("role")).toBe("note");
    expect(notice?.textContent).toContain("External report content is treated as untrusted data.");
  });

  test("WebMCP tool registration lifecycle supports clean abort on navigation", async () => {
    type Tool = {
      name: string;
      execute(input: unknown, options: { signal: AbortSignal }): Promise<unknown>;
    };

    const registeredTools = new Map<string, Tool>();
    let activeController: AbortController | null = null;

    const fakeModelContext = {
      registerTool(tool: Tool, options: { signal: AbortSignal }) {
        registeredTools.set(tool.name, tool);
        options.signal.addEventListener(
          "abort",
          () => {
            registeredTools.delete(tool.name);
          },
          { once: true },
        );
        return Promise.resolve();
      },
    };

    // On demo view: activate tool
    activeController = new AbortController();
    await fakeModelContext.registerTool(
      {
        execute: () => Promise.resolve("demo result"),
        name: "filika_demo_save_draft",
      },
      { signal: activeController.signal },
    );

    expect(registeredTools.has("filika_demo_save_draft")).toBe(true);

    // Navigate to inbox: deactivate tool
    activeController.abort();
    activeController = null;

    expect(registeredTools.has("filika_demo_save_draft")).toBe(false);
    expect(registeredTools.size).toBe(0);

    // Return to demo view: reactivate tool
    activeController = new AbortController();
    await fakeModelContext.registerTool(
      {
        execute: () => Promise.resolve("demo result"),
        name: "filika_demo_save_draft",
      },
      { signal: activeController.signal },
    );

    expect(registeredTools.has("filika_demo_save_draft")).toBe(true);
    expect(registeredTools.size).toBe(1);
  });
});
