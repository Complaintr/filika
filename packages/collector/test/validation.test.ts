import { describe, expect, test } from "bun:test";
import { accountSettingsSchema } from "../src/account-profile";
import { createApplicationSchema } from "../src/applications";
import { ENVELOPE_FIELD_LIMITS } from "../src/envelope";
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

describe("application and profile validation", () => {
  const input = {
    displayName: "My Store",
    slug: "my-store",
    allowedOrigins: ["https://my-store.example"],
    dashboardDays: 30,
  };
  test("rejects reserved paths, invalid origins, and unknown ownership fields", () => {
    expect(createApplicationSchema.safeParse(input).success).toBe(true);
    for (const slug of [
      "account",
      "api",
      "onboarding",
      "login",
      "../my-store",
      "My Store",
      "my-store/complaints",
      "x".repeat(49),
    ]) {
      expect(createApplicationSchema.safeParse({ ...input, slug }).success).toBe(false);
    }
    for (const origin of [
      "*",
      "null",
      "http://my-store.example",
      "https://my-store.example/path",
      "https://user:pass@my-store.example",
    ]) {
      expect(
        createApplicationSchema.safeParse({ ...input, allowedOrigins: [origin] }).success,
      ).toBe(false);
    }
    expect(
      createApplicationSchema.safeParse({ ...input, ownerUserId: "another-account" }).success,
    ).toBe(false);
    expect(
      createApplicationSchema.safeParse({
        ...input,
        allowedOrigins: Array(21).fill("https://my-store.example"),
      }).success,
    ).toBe(false);
  });
  test("account patches stay within the supported settings options", () => {
    expect(accountSettingsSchema.safeParse({ theme: "dark" }).success).toBe(true);
    expect(accountSettingsSchema.safeParse({ name: "Renamed" }).success).toBe(true);
    expect(accountSettingsSchema.safeParse({}).success).toBe(false);
    expect(accountSettingsSchema.safeParse({ useGoogleImage: true }).success).toBe(false);
    expect(accountSettingsSchema.safeParse({ image: "https://avatar.example/photo" }).success).toBe(
      false,
    );
  });
});

describe("envelope and project validation", () => {
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

  test("bounds free-text fields by code points, matching the SDK count", () => {
    const emoji = "😀".repeat(4000);
    const atLimit = {
      ...VALID_ENVELOPE,
      feedback: { ...VALID_ENVELOPE.feedback, description: emoji },
    };
    expect(validateEnvelope(atLimit).ok).toBe(true);
    expect(
      validateEnvelope({ ...atLimit, feedback: { ...atLimit.feedback, description: `${emoji}😀` } })
        .ok,
    ).toBe(false);
  });

  test("rejects envelopes over the SDK byte budget", () => {
    // Every field sits inside its code-point limit, but astral characters
    // inflate the UTF-8 bytes across fields far beyond the envelope budget.
    const emoji = "😀";
    const oversized = {
      ...VALID_ENVELOPE,
      feedback: {
        ...VALID_ENVELOPE.feedback,
        title: emoji.repeat(160),
        description: emoji.repeat(4000),
        expectedBehavior: emoji.repeat(2000),
        reproductionSteps: Array.from({ length: 10 }, () => emoji.repeat(500)),
      },
      context: {
        ...VALID_ENVELOPE.context,
        routeLabel: emoji.repeat(120),
        applicationRelease: emoji.repeat(80),
      },
    };
    const byteLength = bytesOf(oversized).length;
    expect(byteLength).toBeGreaterThan(ENVELOPE_FIELD_LIMITS.envelopeBytes);
    expect(validateEnvelope(oversized).ok).toBe(false);
  });

  test("checks the origin against the project allowlist", () => {
    expect(isOriginAllowed("http://localhost:4173", ["http://localhost:4173"])).toBe(true);
    expect(isOriginAllowed("http://evil.example", ["http://localhost:4173"])).toBe(false);
  });
});
