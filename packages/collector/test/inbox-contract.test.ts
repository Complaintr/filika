import { describe, expect, test } from "bun:test";

import type { Feedback } from "../src/db/schema";
import {
  boundPageSize,
  INBOX_PAGE_SIZE_DEFAULT,
  INBOX_PAGE_SIZE_MAX,
  INBOX_READ_ONLY,
  isBoundedPageSize,
  toInboxItem,
} from "../src/inbox-contract";

const FEEDBACK_ROW: Feedback = {
  applicationRelease: "1.2.0",
  description: "The save button did nothing.",
  eventId: "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b",
  expectedBehavior: "The draft should be saved.",
  id: "9f8e7d6c-5b4a-4321-9876-123456789abc",
  kind: "bug",
  origin: "http://localhost:4173",
  projectId: "c0ffee00-0000-0000-0000-000000000001",
  receiptTimestamp: new Date("2026-08-27T18:00:00.000Z"),
  reproductionSteps: ["Open the page", "Click Save"],
  routeLabel: "feedback",
  sdkVersion: "1.0.0",
  source: "web_sdk_unverified",
  title: "Save button is unresponsive",
};

describe("P2-BE-12 read-only inbox query contracts", () => {
  test("keeps the inbox read-only", () => {
    expect(INBOX_READ_ONLY).toBe(true);
  });

  test("bounds list pagination", () => {
    expect(INBOX_PAGE_SIZE_DEFAULT).toBe(25);
    expect(INBOX_PAGE_SIZE_MAX).toBe(50);
    expect(isBoundedPageSize(1)).toBe(true);
    expect(isBoundedPageSize(INBOX_PAGE_SIZE_MAX)).toBe(true);
    expect(isBoundedPageSize(0)).toBe(false);
    expect(isBoundedPageSize(INBOX_PAGE_SIZE_MAX + 1)).toBe(false);
  });

  test("clamps invalid page sizes", () => {
    expect(boundPageSize(0)).toBe(INBOX_PAGE_SIZE_DEFAULT);
    expect(boundPageSize(-5)).toBe(INBOX_PAGE_SIZE_DEFAULT);
    expect(boundPageSize(INBOX_PAGE_SIZE_MAX + 1)).toBe(INBOX_PAGE_SIZE_MAX);
    expect(boundPageSize(10)).toBe(10);
  });

  test("projects only approved public-protocol fields", () => {
    const item = toInboxItem(FEEDBACK_ROW, 24);

    expect(item.feedbackId).toBe(FEEDBACK_ROW.id);
    expect(item.kind).toBe("bug");
    expect(item.title).toBe(FEEDBACK_ROW.title);
    expect(item.description).toBe(FEEDBACK_ROW.description);
    expect(item.expectedBehavior).toBe(FEEDBACK_ROW.expectedBehavior);
    expect(item.reproductionSteps).toEqual(["Open the page", "Click Save"]);
    expect(item.routeLabel).toBe("feedback");
    expect(item.applicationRelease).toBe("1.2.0");
  });

  test("exposes the server-derived facts", () => {
    const item = toInboxItem(FEEDBACK_ROW, 24);

    expect(item.receivedAt).toBe("2026-08-27T18:00:00.000Z");
    expect(item.expiresAt).toBe("2026-08-28T18:00:00.000Z");
    expect(item.requestOrigin).toBe("http://localhost:4173");
    expect(item.source).toBe("web_sdk_unverified");
  });

  test("never exposes the internal project ID or rate-limit data", () => {
    const item = toInboxItem(FEEDBACK_ROW, 24);

    expect(item).not.toHaveProperty("projectId");
    expect(item).not.toHaveProperty("eventId");
    expect(item).not.toHaveProperty("sdkVersion");
    expect(item).not.toHaveProperty("windowKey");
    expect(item).not.toHaveProperty("count");
  });
});
