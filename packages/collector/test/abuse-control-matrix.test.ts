import { describe, expect, test } from "bun:test";

import {
  ABUSE_CONTROL_CROSS_CUTTING,
  ABUSE_CONTROL_MATRIX,
  ABUSE_CONTROL_SCENARIO_IDS,
} from "../src/foundation/abuse-control-matrix";

function scenario(id: string) {
  return ABUSE_CONTROL_MATRIX.find((row) => row.id === id);
}

describe("P0-BE-06 abuse-control test matrix", () => {
  test("covers every baseline scenario exactly once in order", () => {
    expect(ABUSE_CONTROL_MATRIX.map((row) => row.id)).toEqual(ABUSE_CONTROL_SCENARIO_IDS);
  });

  test("rejects a missing origin before ingest", () => {
    const row = scenario("missing_origin");

    expect(row?.httpStatus).toBe(403);
    expect(row?.errorCategory).toBe("denied_origin");
    expect(row?.dbState).toBe("No row written.");
  });

  test("rejects a null origin before ingest", () => {
    const row = scenario("null_origin");

    expect(row?.httpStatus).toBe(403);
    expect(row?.errorCategory).toBe("denied_origin");
  });

  test("rejects a denied origin before ingest", () => {
    const row = scenario("denied_origin");

    expect(row?.httpStatus).toBe(403);
    expect(row?.errorCategory).toBe("denied_origin");
  });

  test("rejects an oversized body before parsing", () => {
    const row = scenario("oversized_body");

    expect(row?.httpStatus).toBe(413);
    expect(row?.errorCategory).toBe("payload_too_large");
    expect(row?.logBehavior).toMatch(/before parse/i);
  });

  test("rejects an invalid project key", () => {
    const row = scenario("invalid_project_key");

    expect(row?.httpStatus).toBe(400);
    expect(row?.errorCategory).toBe("project_not_found");
  });

  test("resolves a repeated event ID without a second row", () => {
    const row = scenario("repeated_event_id");

    expect(row?.httpStatus).toBe(200);
    expect(row?.errorCategory).toBeNull();
    expect(row?.dbState).toMatch(/no second row/i);
  });

  test("every rejection leaves no database row", () => {
    const rejected = ABUSE_CONTROL_MATRIX.filter((row) => row.errorCategory !== null);

    for (const row of rejected) {
      expect(row.dbState).toBe("No row written.");
    }
  });

  test("keeps the cross-cutting assertions complete", () => {
    const assertions = ABUSE_CONTROL_CROSS_CUTTING.join(" ");

    expect(assertions).toMatch(/bounded response/i);
    expect(assertions).toMatch(/no full report body/i);
    expect(assertions).toMatch(/before parsing/i);
    expect(assertions).toMatch(/no second row|original receipt/i);
  });
});
