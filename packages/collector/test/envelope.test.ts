import { describe, expect, test } from "bun:test";

import {
  ENVELOPE_FIELD_LIMITS,
  FEEDBACK_KINDS,
  FILIKA_FEEDBACK_ENVELOPE_V1,
} from "../src/envelope";

const EVENT_ID = "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b";

const VALID_ENVELOPE = {
  schemaVersion: 1,
  projectKey: "filika-demo",
  eventId: EVENT_ID,
  feedback: {
    kind: "bug",
    title: "Save button is unresponsive",
    description: "The save button did nothing.",
    expectedBehavior: "The draft should be saved.",
    reproductionSteps: ["Open the page", "Click Save"],
  },
  context: {
    sdkVersion: "0.0.1",
    routeLabel: "feedback",
    applicationRelease: "1.2.0",
  },
};

describe("P1-BE-01 v1 feedback envelope schema", () => {
  test("accepts a complete valid envelope", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse(VALID_ENVELOPE);

    expect(result.success).toBe(true);
  });

  test("accepts a minimal envelope with only required fields", () => {
    const minimal = {
      schemaVersion: 1,
      projectKey: "filika-demo",
      eventId: EVENT_ID,
      feedback: {
        kind: "bug",
        title: "Save button is unresponsive",
        description: "The save button did nothing.",
      },
      context: { sdkVersion: "0.0.1" },
    };
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse(minimal);

    expect(result.success).toBe(true);
  });

  test("accepts an empty optional expected behavior", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      feedback: { ...VALID_ENVELOPE.feedback, expectedBehavior: "" },
    });

    expect(result.success).toBe(true);
  });

  test("rejects unknown fields at the top level", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      origin: "https://evil.example",
    });

    expect(result.success).toBe(false);
  });

  test("rejects unknown fields inside feedback", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      feedback: { ...VALID_ENVELOPE.feedback, credentials: "top-secret" },
    });

    expect(result.success).toBe(false);
  });

  test("rejects unknown fields inside context", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      context: { ...VALID_ENVELOPE.context, browsingHistory: true },
    });

    expect(result.success).toBe(false);
  });

  test("rejects a missing required field", () => {
    for (const field of ["schemaVersion", "projectKey", "eventId", "feedback", "context"]) {
      const { [field]: _removed, ...withoutField } = VALID_ENVELOPE;
      const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse(withoutField);

      expect(result.success).toBe(false);
    }

    for (const field of ["kind", "title", "description"]) {
      const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
        ...VALID_ENVELOPE,
        feedback: {
          ...VALID_ENVELOPE.feedback,
          [field]: undefined,
        },
      });

      expect(result.success).toBe(false);
    }

    const withoutSdkVersion = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      context: { routeLabel: "feedback" },
    });

    expect(withoutSdkVersion.success).toBe(false);
  });

  test("rejects a wrong schema version", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      schemaVersion: 2,
    });

    expect(result.success).toBe(false);
  });

  test("rejects an invalid event ID", () => {
    for (const eventId of ["not-a-uuid", "5f5e9c2a-9d4e-1b1c-a1f3-2b6c8d0e1a4b"]) {
      const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({ ...VALID_ENVELOPE, eventId });

      expect(result.success).toBe(false);
    }
  });

  test("rejects an unknown or legacy feedback kind", () => {
    for (const kind of ["feature", "blocked", "confusing"]) {
      const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
        ...VALID_ENVELOPE,
        feedback: { ...VALID_ENVELOPE.feedback, kind },
      });

      expect(result.success).toBe(false);
    }
  });

  test("exposes the frozen feedback kinds", () => {
    expect(FEEDBACK_KINDS).toEqual(["bug", "blocked_task", "confusing_behavior", "idea"]);
  });

  test("rejects an invalid sdk version", () => {
    for (const sdkVersion of ["v1.0", "1.0", "1.0.0.1", "not-semver"]) {
      const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
        ...VALID_ENVELOPE,
        context: { ...VALID_ENVELOPE.context, sdkVersion },
      });

      expect(result.success).toBe(false);
    }
  });

  test("rejects an oversized field", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      feedback: {
        ...VALID_ENVELOPE.feedback,
        title: "x".repeat(ENVELOPE_FIELD_LIMITS.titleMax + 1),
      },
    });

    expect(result.success).toBe(false);
  });

  test("rejects more than the bounded reproduction steps", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      feedback: {
        ...VALID_ENVELOPE.feedback,
        reproductionSteps: Array.from(
          { length: ENVELOPE_FIELD_LIMITS.reproductionStepsMax + 1 },
          (_, index) => `Step ${index}`,
        ),
      },
    });

    expect(result.success).toBe(false);
  });

  test("rejects an oversized reproduction step", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      feedback: {
        ...VALID_ENVELOPE.feedback,
        reproductionSteps: ["x".repeat(ENVELOPE_FIELD_LIMITS.reproductionStepMax + 1)],
      },
    });

    expect(result.success).toBe(false);
  });

  test("rejects blank report content", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      feedback: { ...VALID_ENVELOPE.feedback, title: "   " },
    });

    expect(result.success).toBe(false);
  });
});
