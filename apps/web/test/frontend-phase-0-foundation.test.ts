import { describe, expect, test } from "bun:test";

import {
  ACCESSIBILITY_CHECK_IDS,
  ACCESSIBILITY_CHECKLIST,
} from "../src/foundation/accessibility-checklist";
import { FILIKA_DESIGN_TOKENS, FILIKA_TOKEN_CSS } from "../src/foundation/design-tokens";
import {
  INITIAL_SAMPLE_FAILURE_STATE,
  SAMPLE_FAILURE_CODE,
  SAMPLE_FAILURE_MESSAGE,
  SAMPLE_FAILURE_VISIBLE_STATES,
  transitionSampleFailure,
} from "../src/foundation/sample-failure";
import {
  getOrCreateFilikaShadowRoot,
  STYLE_ISOLATION_DECISION,
} from "../src/foundation/style-isolation";
import { UI_STATE_CONTRACTS, UI_STATE_IDS } from "../src/foundation/ui-states";
import { USER_JOURNEY, USER_JOURNEY_STAGE_IDS } from "../src/foundation/user-journey";
import { LOW_FIDELITY_WIREFRAMES, WIREFRAME_IDS } from "../src/foundation/wireframes";

function parseHexColor(value: string): readonly [number, number, number] {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);

  if (
    match === null ||
    match[1] === undefined ||
    match[2] === undefined ||
    match[3] === undefined
  ) {
    throw new Error(`Expected a six-digit hex color, received: ${value}`);
  }

  return [
    Number.parseInt(match[1], 16),
    Number.parseInt(match[2], 16),
    Number.parseInt(match[3], 16),
  ];
}

function relativeLuminance(value: string): number {
  const channels = parseHexColor(value).map((channel) => {
    const normalized = channel / 255;

    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function contrastRatio(first: string, second: string): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));

  return (lighter + 0.05) / (darker + 0.05);
}

describe("P0-FE-01 user journey", () => {
  test("maps the complete failure-to-inbox journey in order", () => {
    expect(USER_JOURNEY.map((stage) => stage.id)).toEqual(USER_JOURNEY_STAGE_IDS);
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

describe("P0-FE-02 UI states", () => {
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

describe("P0-FE-03 low-fidelity layouts", () => {
  test("defines all five required surfaces", () => {
    expect(Object.keys(LOW_FIDELITY_WIREFRAMES).sort()).toEqual([...WIREFRAME_IDS].sort());
  });

  test("keeps authored report, host context, and request facts separate", () => {
    expect(LOW_FIDELITY_WIREFRAMES.inbox_detail.regions.map((region) => region.id)).toEqual([
      "back_navigation",
      "detail_heading",
      "authored_report",
      "host_context",
      "request_facts",
    ]);
  });

  test("keeps reset and manual feedback visible in the sample layout", () => {
    expect(LOW_FIDELITY_WIREFRAMES.sample_application.actions).toContain("Reset sample");
    expect(LOW_FIDELITY_WIREFRAMES.sample_application.actions).toContain("Send feedback");
  });
});

describe("P0-FE-04 original design tokens", () => {
  test("uses Filika-prefixed CSS properties scoped to the host", () => {
    expect(FILIKA_TOKEN_CSS).toContain(":host");
    expect(FILIKA_TOKEN_CSS).toContain("--filika-color-primary");
    expect(FILIKA_TOKEN_CSS.toLowerCase()).not.toContain("complaintr");
  });

  test("meets WCAG AA contrast for primary text combinations", () => {
    expect(
      contrastRatio(FILIKA_DESIGN_TOKENS.color.text, FILIKA_DESIGN_TOKENS.color.surface),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(FILIKA_DESIGN_TOKENS.color.onPrimary, FILIKA_DESIGN_TOKENS.color.primary),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("removes nonessential timing under reduced motion", () => {
    expect(FILIKA_DESIGN_TOKENS.motion.reducedDuration).toBe("0ms");
    expect(FILIKA_TOKEN_CSS).toContain("prefers-reduced-motion: reduce");
  });
});

describe("P0-FE-05 accessibility checklist", () => {
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

describe("P0-FE-06 deterministic sample failure", () => {
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

describe("P0-FE-07 CSS isolation prototype", () => {
  test("chooses an open Shadow DOM boundary", () => {
    expect(STYLE_ISOLATION_DECISION.boundary).toBe("shadow_dom");
    expect(STYLE_ISOLATION_DECISION.mode).toBe("open");
    expect(STYLE_ISOLATION_DECISION.rules).toContain(
      "Do not read host-page class names or copy host-page computed styles.",
    );
  });

  test("reuses an existing shadow root", () => {
    const existingRoot = {} as ShadowRoot;
    const host = {
      attachShadow: () => {
        throw new Error("attachShadow should not be called");
      },
      shadowRoot: existingRoot,
    } as unknown as HTMLElement;

    expect(getOrCreateFilikaShadowRoot(host)).toBe(existingRoot);
  });

  test("creates one open shadow root when none exists", () => {
    const createdRoot = {} as ShadowRoot;
    let receivedOptions: ShadowRootInit | null = null;
    const host = {
      attachShadow: (options: ShadowRootInit) => {
        receivedOptions = options;
        return createdRoot;
      },
      shadowRoot: null,
    } as unknown as HTMLElement;

    expect(getOrCreateFilikaShadowRoot(host)).toBe(createdRoot);
    expect(receivedOptions).toEqual({ mode: "open" });
  });
});
