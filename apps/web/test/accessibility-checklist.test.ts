import { describe, expect, test } from "bun:test";

import {
  ACCESSIBILITY_CHECK_IDS,
  ACCESSIBILITY_CHECKLIST,
} from "../src/foundation/accessibility-checklist";

describe("accessibility-checklist", () => {
  test("defines a verification step for every requirement", () => {
    expect(ACCESSIBILITY_CHECKLIST.map((item) => item.id)).toEqual(ACCESSIBILITY_CHECK_IDS);
    expect(ACCESSIBILITY_CHECKLIST.every((item) => item.verification.length > 0)).toBe(true);
  });

  test("covers native dialog, keyboard, focus return, validation, and reduced motion", () => {
    expect(ACCESSIBILITY_CHECK_IDS).toEqual(
      expect.arrayContaining([
        "native_dialog",
        "keyboard_navigation",
        "focus_return",
        "validation_association",
        "reduced_motion",
      ]),
    );
  });
});
