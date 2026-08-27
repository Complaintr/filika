import { describe, expect, test } from "bun:test";

import { USER_JOURNEY, USER_JOURNEY_STAGE_IDS } from "../src/foundation/user-journey";

describe("user-journey", () => {
  test("maps the complete failure-to-inbox journey in order", () => {
    expect(USER_JOURNEY.map((stage) => stage.id)).toEqual([...USER_JOURNEY_STAGE_IDS]);
    expect(USER_JOURNEY.at(0)?.id).toBe("task_ready");
    expect(USER_JOURNEY.at(-1)?.id).toBe("inbox_detail");
  });

  test("links every non-terminal stage to the next stage", () => {
    for (const [index, stage] of USER_JOURNEY.entries()) {
      expect(stage.next).toBe(USER_JOURNEY[index + 1]?.id ?? null);
    }
  });

  test("preserves user review before transmission", () => {
    const reviewIndex = USER_JOURNEY_STAGE_IDS.indexOf("report_review");
    const confirmationIndex = USER_JOURNEY_STAGE_IDS.indexOf("confirmation");
    const receiptIndex = USER_JOURNEY_STAGE_IDS.indexOf("receipt_visible");

    expect(reviewIndex).toBeLessThan(confirmationIndex);
    expect(confirmationIndex).toBeLessThan(receiptIndex);
  });
});
