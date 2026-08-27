import { describe, expect, test } from "bun:test";

import { readBoundedBody } from "../src/body";
import { FEEDBACK_MAX_BODY_BYTES } from "../src/endpoint-contract";

const ENDPOINT = "http://localhost:8787/api/v1/feedback";

describe("P2-BE-05 oversized body rejection", () => {
  test("rejects an oversized content-length header before reading", async () => {
    const request = new Request(ENDPOINT, {
      headers: {
        "content-length": String(FEEDBACK_MAX_BODY_BYTES + 1),
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(await readBoundedBody(request)).toEqual({ ok: false, reason: "oversized" });
  });

  test("rejects an oversized streamed body", async () => {
    const request = new Request(ENDPOINT, {
      body: "x".repeat(FEEDBACK_MAX_BODY_BYTES + 1),
      method: "POST",
    });

    expect(await readBoundedBody(request)).toEqual({ ok: false, reason: "oversized" });
  });

  test("accepts a body at the exact bound", async () => {
    const request = new Request(ENDPOINT, {
      body: "x".repeat(FEEDBACK_MAX_BODY_BYTES),
      method: "POST",
    });

    const result = await readBoundedBody(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bytes.byteLength).toBe(FEEDBACK_MAX_BODY_BYTES);
    }
  });

  test("returns empty bytes for a bodyless request", async () => {
    const request = new Request(ENDPOINT, { method: "POST" });

    const result = await readBoundedBody(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bytes.byteLength).toBe(0);
    }
  });
});
