import { describe, expect, test } from "bun:test";

import { buildFeedbackInsert, type PersistFeedbackInput } from "../src/persistence";

const INPUT: PersistFeedbackInput = {
  context: {
    applicationRelease: "1.2.0",
    routeLabel: "feedback",
    sdkVersion: "1.0.0",
  },
  eventId: "7f5e9c2a-9d4e-4b1c-a1f3-2b6c8d0e1a4b",
  feedback: {
    description: "The save button did nothing.",
    expectedBehavior: "The draft should be saved.",
    kind: "bug",
    reproductionSteps: ["Open the page", "Click Save"],
    title: "Save button is unresponsive",
  },
  origin: "http://localhost:4173",
  projectId: "c0ffee00-0000-0000-0000-000000000001",
  receivedAt: "2026-08-27T18:00:00.000Z",
  source: "web_sdk_unverified",
};

describe("transactional persistence", () => {
  test("maps the envelope into the feedback row", () => {
    const values = buildFeedbackInsert(INPUT);

    expect(values.eventId).toBe(INPUT.eventId);
    expect(values.kind).toBe("bug");
    expect(values.title).toBe(INPUT.feedback.title);
    expect(values.description).toBe(INPUT.feedback.description);
    expect(values.expectedBehavior).toBe(INPUT.feedback.expectedBehavior);
    expect(values.reproductionSteps).toEqual(["Open the page", "Click Save"]);
    expect(values.sdkVersion).toBe("1.0.0");
    expect(values.routeLabel).toBe("feedback");
    expect(values.applicationRelease).toBe("1.2.0");
    expect(values.origin).toBe("http://localhost:4173");
    expect(values.source).toBe("web_sdk_unverified");
  });

  test("stamps the receipt time as a date", () => {
    const values = buildFeedbackInsert(INPUT);

    expect(values.receiptTimestamp.toISOString()).toBe("2026-08-27T18:00:00.000Z");
  });

  test("stores removed optional fields as null", () => {
    const values = buildFeedbackInsert({
      ...INPUT,
      context: { sdkVersion: "1.0.0" },
      feedback: {
        description: "The save button did nothing.",
        kind: "bug",
        title: "Save button is unresponsive",
      },
    });

    expect(values.applicationRelease).toBeNull();
    expect(values.routeLabel).toBeNull();
    expect(values.expectedBehavior).toBeNull();
    expect(values.reproductionSteps).toBeNull();
  });
});
