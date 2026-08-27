import { describe, expect, test } from "bun:test";

import {
  INITIAL_SAMPLE_FAILURE_STATE,
  SAMPLE_FAILURE_CODE,
  SAMPLE_FAILURE_MESSAGE,
  SAMPLE_FAILURE_VISIBLE_STATES,
  transitionSampleFailure,
} from "../src/foundation/sample-failure";

describe("sample-failure", () => {
  test("produces the same visible failure every time", () => {
    const first = transitionSampleFailure(INITIAL_SAMPLE_FAILURE_STATE, { type: "RUN_SAMPLE" });
    const second = transitionSampleFailure(INITIAL_SAMPLE_FAILURE_STATE, { type: "RUN_SAMPLE" });

    expect(first).toEqual(second);
    expect(first).toEqual({
      code: SAMPLE_FAILURE_CODE,
      message: SAMPLE_FAILURE_MESSAGE,
      status: "failed",
    });
  });

  test("defines visible ready, failed, and resetting states", () => {
    expect(Object.keys(SAMPLE_FAILURE_VISIBLE_STATES).sort()).toEqual(
      ["failed", "ready", "resetting"].sort(),
    );
  });

  test("resets the sample to its original state", () => {
    const failed = transitionSampleFailure(INITIAL_SAMPLE_FAILURE_STATE, { type: "RUN_SAMPLE" });
    const resetting = transitionSampleFailure(failed, { type: "RESET" });
    const ready = transitionSampleFailure(resetting, { type: "RESET_COMPLETE" });

    expect(ready).toEqual(INITIAL_SAMPLE_FAILURE_STATE);
  });
});
