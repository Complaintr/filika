import { describe, expect, test } from "bun:test";

import { checkIdempotency, readEventId } from "../src/idempotency";

const EVENT_ID = "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b";

describe("idempotency key", () => {
  test("reads the event id from a parsed body object", () => {
    expect(readEventId({ eventId: EVENT_ID })).toBe(EVENT_ID);
  });

  test("rejects bodies without a string event id", () => {
    expect(readEventId(null)).toBeNull();
    expect(readEventId("eventId")).toBeNull();
    expect(readEventId([EVENT_ID])).toBeNull();
    expect(readEventId({})).toBeNull();
    expect(readEventId({ eventId: 1 })).toBeNull();
  });

  test("accepts a matching idempotency key", () => {
    const request = new Request("http://localhost:8787/api/v1/feedback", {
      headers: { "Idempotency-Key": EVENT_ID },
      method: "POST",
    });

    expect(checkIdempotency({ eventId: EVENT_ID }, request)).toBe(true);
  });

  test("rejects a missing or mismatched idempotency key", () => {
    const missing = new Request("http://localhost:8787/api/v1/feedback", {
      method: "POST",
    });
    const mismatched = new Request("http://localhost:8787/api/v1/feedback", {
      headers: { "Idempotency-Key": "other" },
      method: "POST",
    });

    expect(checkIdempotency({ eventId: EVENT_ID }, missing)).toBe(false);
    expect(checkIdempotency({ eventId: EVENT_ID }, mismatched)).toBe(false);
  });

  test("rejects a request whose body has no readable event id", () => {
    const request = new Request("http://localhost:8787/api/v1/feedback", {
      headers: { "Idempotency-Key": EVENT_ID },
      method: "POST",
    });

    expect(checkIdempotency({}, request)).toBe(false);
  });
});
