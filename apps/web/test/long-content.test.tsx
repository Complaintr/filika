import { describe, expect, test } from "bun:test";

import type { InboxDetailViewModel } from "../src/contracts/inbox-view-model";
import { InboxDetailState, InboxList } from "../src/workspace/inbox-view";
import { renderReact } from "./helpers/render-react";

function repeat(text: string, length: number): string {
  return text.repeat(Math.ceil(length / text.length)).slice(0, length);
}

describe("long-content", () => {
  const longTitle = repeat("t", 160);
  const longDescription = repeat("d", 4000);
  const longSteps = Array.from({ length: 10 }, (_, index) => repeat(`s${index}`, 300)).join("\n");

  const feedback: InboxDetailViewModel = {
    applicationRelease: null,
    description: longDescription,
    expectedBehavior: null,
    expiresAt: "2026-08-29T10:00:00.000Z",
    feedbackId: "fb_long_123",
    kind: "bug",
    receivedAt: "2026-08-28T10:00:00.000Z",
    reproductionSteps: longSteps,
    requestOrigin: "http://localhost:4173",
    routeLabel: null,
    source: "web_sdk_unverified",
    title: longTitle,
  };

  test("renders long report content without shortening it in the inbox list", async () => {
    const result = await renderReact(<InboxList items={[feedback]} />);
    const heading = result.container.querySelector("h2");
    expect(heading?.textContent).toBe(longTitle);
    await result.close();
  });

  test("renders long report content without shortening it in the inbox detail", async () => {
    const result = await renderReact(<InboxDetailState state={{ feedback, status: "ready" }} />);
    const values = [...result.container.querySelectorAll("dd")].map(
      (item) => item.textContent ?? "",
    );
    expect(values).toContain(longDescription);
    expect(values).toContain(longSteps);
    await result.close();
  });

  test("report surfaces use no truncation styling", async () => {
    const dialogSource = await Bun.file(
      `${import.meta.dir}/../src/components/feedback-dialog.ts`,
    ).text();
    const appCss = await Bun.file(`${import.meta.dir}/../src/app.css`).text();
    for (const source of [dialogSource]) {
      expect(source).not.toContain("text-overflow");
      expect(source).not.toContain("line-clamp");
      expect(source).not.toContain("ellipsis");
    }
    const reportClasses = [".detail-field", ".detail-group", ".complaint-table"];
    for (const selector of reportClasses) {
      const index = appCss.indexOf(selector);
      const block = index === -1 ? "" : appCss.slice(index, index + 400);
      expect(block).not.toContain("text-overflow");
      expect(block).not.toContain("line-clamp");
    }
  });

  test("non-ready inbox states keep their copy intact", async () => {
    const result = await renderReact(<InboxDetailState state={{ status: "not_found" }} />);
    expect(result.container.textContent).toContain(
      "The feedback may have been removed or the address may be incorrect.",
    );
    await result.close();
  });
});
