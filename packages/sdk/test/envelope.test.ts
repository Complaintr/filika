import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import { FEEDBACK_ENVELOPE_SCHEMA, FEEDBACK_LIMITS, type FilikaFeedbackEnvelopeV1 } from "../src";

export const envelope = (): FilikaFeedbackEnvelopeV1 => ({
  schemaVersion: 1,
  projectKey: "demo_project",
  eventId: "12345678-1234-4234-8234-123456789abc",
  feedback: { kind: "bug", title: "Save failed", description: "Saving a draft showed an error." },
  context: { sdkVersion: "0.0.0" },
});

const validate = new Ajv({ strict: true }).compile(FEEDBACK_ENVELOPE_SCHEMA);

describe("V1 envelope", () => {
  test("accepts minimal and fully populated envelopes", () => {
    expect(validate(envelope())).toBe(true);
    const value = envelope();
    value.feedback.expectedBehavior = "The draft is saved.";
    value.feedback.reproductionSteps = ["Open a draft", "Select Save"];
    value.context.routeLabel = "draft-editor";
    value.context.applicationRelease = "demo-1";
    expect(validate(value)).toBe(true);
  });

  test("rejects unknown fields at each object boundary", () => {
    for (const field of ["origin", "source", "receivedAt", "feedbackId", "pageContent"]) {
      expect(validate({ ...envelope(), [field]: "untrusted" })).toBe(false);
    }
    expect(validate({ ...envelope(), feedback: { ...envelope().feedback, url: "secret" } })).toBe(
      false,
    );
    expect(validate({ ...envelope(), context: { ...envelope().context, url: "secret" } })).toBe(
      false,
    );
  });

  test("requires every mandatory field and rejects invalid primitives", () => {
    for (const key of FEEDBACK_ENVELOPE_SCHEMA.required) {
      const value: Record<string, unknown> = { ...envelope() };
      delete value[key];
      expect(validate(value)).toBe(false);
    }
    for (const patch of [
      { schemaVersion: "1" },
      { schemaVersion: 2 },
      { eventId: "invalid" },
      { projectKey: "" },
      { context: null },
    ]) {
      expect(validate({ ...envelope(), ...patch })).toBe(false);
    }
    for (const patch of [{ kind: "other" }, { title: " " }, { description: "" }, { title: null }]) {
      expect(validate({ ...envelope(), feedback: { ...envelope().feedback, ...patch } })).toBe(
        false,
      );
    }
  });

  test("enforces string and list boundaries without truncation", () => {
    for (const field of ["title", "description", "expectedBehavior"] as const) {
      const value = envelope();
      value.feedback[field] = "a".repeat(FEEDBACK_LIMITS[field]);
      expect(validate(value)).toBe(true);
      value.feedback[field] += "a";
      expect(validate(value)).toBe(false);
    }
    const value = envelope();
    value.feedback.reproductionSteps = Array(10).fill("a".repeat(500));
    expect(validate(value)).toBe(true);
    value.feedback.reproductionSteps.push("extra");
    expect(validate(value)).toBe(false);
    value.feedback.reproductionSteps = ["a".repeat(501)];
    expect(validate(value)).toBe(false);
    value.feedback.reproductionSteps = [""];
    expect(validate(value)).toBe(false);
  });

  test("rejects trailing line terminators in identifiers and SDK versions", () => {
    for (const suffix of ["\n", "\r", "\u2028", "\u2029"]) {
      expect(validate({ ...envelope(), projectKey: `demo${suffix}` })).toBe(false);
      expect(validate({ ...envelope(), context: { sdkVersion: `0.0.0${suffix}` } })).toBe(false);
    }
  });

  test("enforces host field bounds and counts Unicode code points", () => {
    for (const field of ["routeLabel", "applicationRelease"] as const) {
      const value = envelope();
      value.context[field] = "a".repeat(FEEDBACK_LIMITS[field]);
      expect(validate(value)).toBe(true);
      value.context[field] += "a";
      expect(validate(value)).toBe(false);
    }
    expect(validate({ ...envelope(), projectKey: "a".repeat(128) })).toBe(true);
    expect(validate({ ...envelope(), projectKey: "a".repeat(129) })).toBe(false);
    const value = envelope();
    const wideCharacter = String.fromCodePoint(0x1f600);
    value.feedback.title = wideCharacter.repeat(160);
    expect(validate(value)).toBe(true);
    value.feedback.title += wideCharacter;
    expect(validate(value)).toBe(false);
  });
});
