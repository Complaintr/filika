import { describe, expect, test } from "bun:test";

import { decodeJsonBody } from "../src/parse";
import { isOriginAllowed } from "../src/project";
import { validateEnvelope } from "../src/validate";

const VALID_ENVELOPE = {
  context: { sdkVersion: "1.0.0" },
  eventId: "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b",
  feedback: {
    description: "The save button did nothing.",
    kind: "bug",
    title: "Save button is unresponsive",
  },
  projectKey: "filika-demo",
  schemaVersion: 1,
};

function bytesOf(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

describe("P2-BE-06 envelope and project validation", () => {
  test("requires the strict json content type", () => {
    expect(decodeJsonBody(bytesOf(VALID_ENVELOPE), null)).toEqual({
      ok: false,
      reason: "invalid_input",
    });
    expect(decodeJsonBody(bytesOf(VALID_ENVELOPE), "text/plain")).toEqual({
      ok: false,
      reason: "invalid_input",
    });
  });

  test("rejects invalid utf-8 bytes", () => {
    const invalidBytes = new Uint8Array([0xc3, 0x28, 0x29]);

    expect(decodeJsonBody(invalidBytes, "application/json")).toEqual({
      ok: false,
      reason: "invalid_input",
    });
  });

  test("rejects malformed json", () => {
    const bytes = new TextEncoder().encode("{ not json");

    expect(decodeJsonBody(bytes, "application/json")).toEqual({
      ok: false,
      reason: "invalid_input",
    });
  });

  test("decodes a valid json body", () => {
    const result = decodeJsonBody(bytesOf(VALID_ENVELOPE), "application/json");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(VALID_ENVELOPE);
    }
  });

  test("accepts a valid envelope", () => {
    expect(validateEnvelope(VALID_ENVELOPE).ok).toBe(true);
  });

  test("rejects an envelope with an unknown field", () => {
    expect(validateEnvelope({ ...VALID_ENVELOPE, origin: "https://evil.example" }).ok).toBe(false);
  });

  test("rejects an envelope with ill-formed unicode", () => {
    const withLoneSurrogate = {
      ...VALID_ENVELOPE,
      feedback: {
        ...VALID_ENVELOPE.feedback,
        description: "bad \ud800 text",
      },
    };

    expect(validateEnvelope(withLoneSurrogate).ok).toBe(false);
  });

  test("checks the origin against the project allowlist", () => {
    expect(isOriginAllowed("http://localhost:4173", ["http://localhost:4173"])).toBe(true);
    expect(isOriginAllowed("http://evil.example", ["http://localhost:4173"])).toBe(false);
  });
});
