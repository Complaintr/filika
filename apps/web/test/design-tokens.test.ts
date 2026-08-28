import { describe, expect, test } from "bun:test";

import { FILIKA_DESIGN_TOKENS, FILIKA_TOKEN_CSS } from "../src/foundation/design-tokens";

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

describe("design-tokens", () => {
  test("uses Filika-prefixed CSS properties scoped to the host", () => {
    expect(FILIKA_TOKEN_CSS).toContain(":host");
    expect(FILIKA_TOKEN_CSS).toContain("--filika-color-primary");
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

  test("declares a single light color scheme without dark theme overrides", () => {
    expect(FILIKA_TOKEN_CSS).toContain("color-scheme: light");
    expect(FILIKA_TOKEN_CSS).not.toContain("prefers-color-scheme: dark");
    expect(FILIKA_TOKEN_CSS).not.toContain('data-theme="dark"');
  });
});
