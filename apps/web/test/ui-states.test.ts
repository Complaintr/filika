import { describe, expect, test } from "bun:test";

import { UI_STATE_CONTRACTS, UI_STATE_IDS } from "../src/foundation/ui-states";

describe("ui-states", () => {
  test("defines every planned state and every SDK-facing failure state", () => {
    expect(Object.keys(UI_STATE_CONTRACTS).sort()).toEqual([...UI_STATE_IDS].sort());
    expect(UI_STATE_IDS).toContain("unsupported_browser");
    expect(UI_STATE_IDS).toContain("duplicate");
    expect(UI_STATE_IDS).toContain("outcome_unknown");
  });

  test("keeps manual feedback available in unsupported browsers", () => {
    expect(UI_STATE_CONTRACTS.unsupported_browser.primaryAction).toBe("open_feedback");
    expect(UI_STATE_CONTRACTS.unsupported_browser.blocksHostInteraction).toBe(false);
  });

  test("uses bounded generic copy for internal errors", () => {
    expect(UI_STATE_CONTRACTS.internal_error.announcement).toBe("Feedback could not be submitted.");
  });
});
