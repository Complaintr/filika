import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FeedbackDialog } from "../src/components/feedback-dialog";
import { FILIKA_DESIGN_TOKENS, FILIKA_TOKEN_CSS } from "../src/foundation/design-tokens";

function hexToRgb(hex: string): { b: number; g: number; r: number } {
  const normalized = hex.replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  if (normalized.length === 6) {
    return {
      b: bigint & 255,
      g: (bigint >> 8) & 255,
      r: (bigint >> 16) & 255,
    };
  }
  if (normalized.length === 3) {
    const r = ((bigint >> 8) & 15) * 17;
    const g = ((bigint >> 4) & 15) * 17;
    const b = (bigint & 15) * 17;
    return { b, g, r };
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

function luminance({ b, g, r }: { b: number; g: number; r: number }): number {
  const [sR, sG, sB] = [r, g, b].map((val) => {
    const channel = val / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = luminance(hexToRgb(hex1));
  const lum2 = luminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("visible focus and contrast in every UI state", () => {
  test("light theme design tokens meet WCAG AA contrast standards (>= 4.5:1)", () => {
    const surface = FILIKA_DESIGN_TOKENS.color.surface; // #ffffff
    const text = FILIKA_DESIGN_TOKENS.color.text; // #123330
    const textMuted = FILIKA_DESIGN_TOKENS.color.textMuted; // #476966
    const primary = FILIKA_DESIGN_TOKENS.color.primary; // #0f766e
    const onPrimary = FILIKA_DESIGN_TOKENS.color.onPrimary; // #ffffff
    const danger = FILIKA_DESIGN_TOKENS.color.danger; // #9f2633
    const focus = FILIKA_DESIGN_TOKENS.color.focus; // #0e7490

    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(textMuted, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(onPrimary, primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(danger, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(focus, surface)).toBeGreaterThanOrEqual(3.0);
  });

  test("dark theme design tokens meet WCAG AA contrast standards (>= 4.5:1)", () => {
    const darkSurface = "#18181b";
    const darkText = "#f4f4f5";
    const darkTextMuted = "#a1a1aa";
    const darkPrimary = "#14b8a6";
    const darkOnPrimary = "#042f2e";
    const darkDanger = "#f87171";
    const darkFocus = "#2dd4bf";

    expect(contrastRatio(darkText, darkSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkTextMuted, darkSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkOnPrimary, darkPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkDanger, darkSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkFocus, darkSurface)).toBeGreaterThanOrEqual(3.0);
  });

  test("CSS token definitions export visible focus width, offset, and focus color", () => {
    expect(FILIKA_TOKEN_CSS).toContain("--filika-focus-width: 3px");
    expect(FILIKA_TOKEN_CSS).toContain("--filika-focus-offset: 3px");
    expect(FILIKA_TOKEN_CSS).toContain("--filika-color-focus");
  });

  test("interactive elements in feedback dialog define visible focus-visible outline rules", () => {
    const window = new Window({ url: "http://localhost:4173" });
    const document = window.document as unknown as Document;
    const host = document.createElement("div");
    document.body.append(host);

    const dialog = new FeedbackDialog(host, {
      identity: {
        collectorOrigin: "http://localhost:8787",
        privacyUrl: "#privacy",
        projectName: "Filika demo",
        retentionSummary: "24h retention",
      },
      submit: () => Promise.resolve({ outcome: "cancelled" }),
    });

    void dialog.open({}, "manual");
    const shadow = host.shadowRoot;
    const styleEl = shadow?.querySelector("style");

    expect(styleEl?.textContent).toContain(":focus-visible");
    expect(styleEl?.textContent).toContain(
      "outline: var(--filika-focus-width) solid var(--filika-color-focus)",
    );
    expect(styleEl?.textContent).toContain("outline-offset: var(--filika-focus-offset)");
  });
});
