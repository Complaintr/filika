import { describe, expect, test } from "bun:test";

import { CLEANUP_COMMAND_NAME, cleanupDeadline } from "../src/db/cleanup";
import { FEEDBACK_RETENTION_HOURS } from "../src/foundation/data-lifecycle";

describe("P2-BE-13 retention cleanup command", () => {
  test("deletes feedback older than the 24-hour window", () => {
    const now = new Date("2026-08-27T18:00:00.000Z");

    expect(cleanupDeadline(now, FEEDBACK_RETENTION_HOURS).toISOString()).toBe(
      "2026-08-26T18:00:00.000Z",
    );
  });

  test("pins the cleanup command name", () => {
    expect(CLEANUP_COMMAND_NAME).toBe("db:cleanup");
    expect(FEEDBACK_RETENTION_HOURS).toBe(24);
  });
});
