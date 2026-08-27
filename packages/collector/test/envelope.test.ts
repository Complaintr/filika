import { describe, expect, test } from "bun:test";

import {
  ENVELOPE_FIELD_LIMITS,
  FEEDBACK_KINDS,
  FILIKA_FEEDBACK_ENVELOPE_V1,
} from "../src/envelope";

const EVENT_ID = "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b";

const VALID_ENVELOPE = {
  applicationRelease: "1.2.0",
  description: "The save button did nothing.",
  eventId: EVENT_ID,
  expectedBehavior: "The draft should be saved.",
  kind: "bug",
  optionalContext: [{ label: "OS", value: "macOS 15" }],
  projectKey: "filika-demo",
  reproductionSteps: "Open the page, click Save.",
  routeLabel: "feedback",
  title: "Save button is unresponsive",
};

describe("P1-BE-01 v1 feedback envelope schema", () => {
  test("accepts a complete valid envelope", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse(VALID_ENVELOPE);

    expect(result.success).toBe(true);
  });

  test("accepts a minimal envelope with only required fields", () => {
    const { applicationRelease, optionalContext, routeLabel, ...minimal } = VALID_ENVELOPE;
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse(minimal);

    expect(result.success).toBe(true);
  });

  test("rejects unknown fields", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      origin: "https://evil.example",
    });

    expect(result.success).toBe(false);
  });

  test("rejects a missing required field", () => {
    for (const field of [
      "projectKey",
      "eventId",
      "kind",
      "title",
      "description",
      "expectedBehavior",
      "reproductionSteps",
    ]) {
      const { [field]: _removed, ...withoutField } = VALID_ENVELOPE;
      const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse(withoutField);

      expect(result.success).toBe(false);
    }
  });

  test("rejects an invalid event ID", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      eventId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });

  test("rejects an unknown feedback kind", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      kind: "feature",
    });

    expect(result.success).toBe(false);
  });

  test("exposes the frozen feedback kinds", () => {
    expect(FEEDBACK_KINDS).toEqual(["bug", "blocked", "confusing", "idea"]);
  });

  test("rejects an oversized field", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      title: "x".repeat(ENVELOPE_FIELD_LIMITS.titleMax + 1),
    });

    expect(result.success).toBe(false);
  });

  test("rejects more than the bounded context items", () => {
    const optionalContext = Array.from(
      { length: ENVELOPE_FIELD_LIMITS.optionalContextMax + 1 },
      (_, index) => ({ label: `L${index}`, value: `V${index}` }),
    );

    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      optionalContext,
    });

    expect(result.success).toBe(false);
  });

  test("rejects unknown fields inside a context item", () => {
    const result = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      optionalContext: [{ label: "OS", value: "macOS 15", extra: "nope" }],
    });

    expect(result.success).toBe(false);
  });

  test("rejects a context item that is missing label or value", () => {
    const withoutLabel = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      optionalContext: [{ value: "macOS 15" }],
    });
    const withoutValue = FILIKA_FEEDBACK_ENVELOPE_V1.safeParse({
      ...VALID_ENVELOPE,
      optionalContext: [{ label: "OS" }],
    });

    expect(withoutLabel.success).toBe(false);
    expect(withoutValue.success).toBe(false);
  });
});
