import { describe, expect, test } from "bun:test";

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

describe("P4-BE-04 body-supplied server claims", () => {
  test("rejects every top-level body-supplied server claim", () => {
    for (const field of [
      "origin",
      "source",
      "receivedAt",
      "timestamp",
      "feedbackId",
      "identity",
      "role",
    ]) {
      expect(validateEnvelope({ ...BASE, [field]: "client-supplied" }).ok).toBe(false);
    }
  });

  test("rejects nested server claims inside feedback", () => {
    for (const field of ["origin", "source", "receivedAt", "identity"]) {
      expect(
        validateEnvelope({
          ...BASE,
          feedback: { ...BASE.feedback, [field]: "client-supplied" },
        }).ok,
      ).toBe(false);
    }
  });

  test("rejects nested server claims inside context", () => {
    for (const field of ["origin", "source", "receivedAt", "identity"]) {
      expect(
        validateEnvelope({
          ...BASE,
          context: { sdkVersion: "1.0.0", [field]: "client-supplied" },
        }).ok,
      ).toBe(false);
    }
  });
});
