import { describe, expect, test } from "bun:test";

import {
  REJECTED_CLIENT_CLAIMS,
  SERVER_DERIVED_FIELDS,
  UNTRUSTED_CLIENT_FIELDS,
  UNVERIFIED_SOURCE,
} from "../src/foundation/field-trust";

describe("field trust classification", () => {
  test("derives every server-owned field server-side", () => {
    expect(SERVER_DERIVED_FIELDS.map((field) => field.field)).toEqual([
      "requestOrigin",
      "source",
      "feedbackId",
      "receiptTimestamp",
      "projectIdentity",
      "rateLimitDecision",
      "retentionWindow",
    ]);
  });

  test("marks the source as the unverified web SDK", () => {
    expect(UNVERIFIED_SOURCE).toBe("web_sdk_unverified");
    const source = SERVER_DERIVED_FIELDS.find((field) => field.field === "source");

    expect(source?.derivation).toContain("web_sdk_unverified");
  });

  test("derives request origin from the header, never from the body", () => {
    const origin = SERVER_DERIVED_FIELDS.find((field) => field.field === "requestOrigin");

    expect(origin?.derivation).toMatch(/header/i);
    expect(origin?.notes).toMatch(/never taken from the body/i);
  });

  test("treats every agent and host-supplied field as untrusted", () => {
    const clientFields = UNTRUSTED_CLIENT_FIELDS.map((field) => field.field);

    expect(clientFields).toEqual([
      "projectKey",
      "eventId",
      "kind",
      "title",
      "description",
      "expectedBehavior",
      "reproductionSteps",
      "optionalContext",
      "routeLabel",
      "applicationRelease",
    ]);
  });

  test("keeps server-derived and untrusted client fields disjoint", () => {
    const serverFields = new Set(SERVER_DERIVED_FIELDS.map((field) => field.field));
    const clientFields = new Set(UNTRUSTED_CLIENT_FIELDS.map((field) => field.field));

    for (const field of serverFields) {
      expect(clientFields.has(field)).toBe(false);
    }
  });

  test("rejects body claims of origin, source, time, and identity", () => {
    const claims = REJECTED_CLIENT_CLAIMS.join(" ");

    expect(claims).toMatch(/Origin/i);
    expect(claims).toMatch(/Source/i);
    expect(claims).toMatch(/Timestamp/i);
    expect(claims).toMatch(/Identity/i);
    expect(claims).toMatch(/Role/i);
  });
});
