import { describe, expect, test } from "bun:test";
import { FEEDBACK_MAX_BODY_BYTES } from "../src/endpoint-contract";
import { ENVELOPE_FIELD_LIMITS } from "../src/envelope";
import { validateEnvelope } from "../src/validate";

const EVENT_ID = "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b";

const BASE = {
  context: { sdkVersion: "1.0.0" },
  eventId: EVENT_ID,
  feedback: {
    description: "The save button did nothing.",
    kind: "bug",
    title: "Save button is unresponsive",
  },
  projectKey: "filika-demo",
  schemaVersion: 1,
};

describe("size limits", () => {
  test("rejects an over-limit title", () => {
    const envelope = {
      ...BASE,
      feedback: { ...BASE.feedback, title: "x".repeat(ENVELOPE_FIELD_LIMITS.titleMax + 1) },
    };

    expect(validateEnvelope(envelope).ok).toBe(false);
  });

  test("rejects an over-limit description", () => {
    const envelope = {
      ...BASE,
      feedback: {
        ...BASE.feedback,
        description: "x".repeat(ENVELOPE_FIELD_LIMITS.descriptionMax + 1),
      },
    };

    expect(validateEnvelope(envelope).ok).toBe(false);
  });

  test("rejects an over-limit expected behavior", () => {
    const envelope = {
      ...BASE,
      feedback: {
        ...BASE.feedback,
        expectedBehavior: "x".repeat(ENVELOPE_FIELD_LIMITS.expectedBehaviorMax + 1),
      },
    };

    expect(validateEnvelope(envelope).ok).toBe(false);
  });

  test("rejects an over-limit reproduction step", () => {
    const envelope = {
      ...BASE,
      feedback: {
        ...BASE.feedback,
        reproductionSteps: ["x".repeat(ENVELOPE_FIELD_LIMITS.reproductionStepMax + 1)],
      },
    };

    expect(validateEnvelope(envelope).ok).toBe(false);
  });

  test("rejects a reproduction-step list over the bound", () => {
    const envelope = {
      ...BASE,
      feedback: {
        ...BASE.feedback,
        reproductionSteps: Array.from(
          { length: ENVELOPE_FIELD_LIMITS.reproductionStepsMax + 1 },
          (_, index) => `step ${index}`,
        ),
      },
    };

    expect(validateEnvelope(envelope).ok).toBe(false);
  });

  test("accepts a reproduction-step list at the bound", () => {
    const envelope = {
      ...BASE,
      feedback: {
        ...BASE.feedback,
        reproductionSteps: Array.from(
          { length: ENVELOPE_FIELD_LIMITS.reproductionStepsMax },
          (_, index) => `step ${index}`,
        ),
      },
    };

    expect(validateEnvelope(envelope).ok).toBe(true);
  });

  test("rejects an over-limit project key", () => {
    const envelope = { ...BASE, projectKey: "x".repeat(ENVELOPE_FIELD_LIMITS.projectKeyMax + 1) };

    expect(validateEnvelope(envelope).ok).toBe(false);
  });

  test("rejects an over-limit sdk version", () => {
    const envelope = {
      ...BASE,
      context: { sdkVersion: "x".repeat(ENVELOPE_FIELD_LIMITS.sdkVersionMax + 1) },
    };

    expect(validateEnvelope(envelope).ok).toBe(false);
  });

  test("rejects an over-limit route label and application release", () => {
    const overLabel = {
      ...BASE,
      context: {
        sdkVersion: "1.0.0",
        routeLabel: "x".repeat(ENVELOPE_FIELD_LIMITS.routeLabelMax + 1),
      },
    };
    const overRelease = {
      ...BASE,
      context: {
        applicationRelease: "x".repeat(ENVELOPE_FIELD_LIMITS.applicationReleaseMax + 1),
        sdkVersion: "1.0.0",
      },
    };

    expect(validateEnvelope(overLabel).ok).toBe(false);
    expect(validateEnvelope(overRelease).ok).toBe(false);
  });

  test("pins the total-envelope and body-size bounds", () => {
    expect(ENVELOPE_FIELD_LIMITS.envelopeBytes).toBe(32_768);
    expect(FEEDBACK_MAX_BODY_BYTES).toBe(65_536);
  });
});
