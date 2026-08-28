export const FILIKA_DESIGN_TOKENS = {
  color: {
    accent: "#668af2",
    border: "#e5e8ee",
    danger: "#9f2633",
    focus: "#3563e9",
    onPrimary: "#ffffff",
    primary: "#3563e9",
    surface: "#ffffff",
    surfaceMuted: "#f7f8fa",
    text: "#253047",
    textMuted: "#5f6b7d",
  },
  focus: {
    offset: "3px",
    width: "3px",
  },
  motion: {
    durationFast: "160ms",
    durationNormal: "240ms",
    easingStandard: "cubic-bezier(0.22, 1, 0.36, 1)",
    reducedDuration: "0ms",
  },
  radius: {
    control: "8px",
    panel: "12px",
    pill: "999px",
  },
  spacing: {
    lg: "24px",
    md: "16px",
    sm: "12px",
    xl: "32px",
    xs: "8px",
  },
  typography: {
    body: "16px",
    family: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    heading: "24px",
    lineHeight: "1.5",
    small: "14px",
    weightBody: "400",
    weightStrong: "650",
  },
} as const;

export const FILIKA_TOKEN_CSS = `
:host {
  --filika-color-accent: ${FILIKA_DESIGN_TOKENS.color.accent};
  --filika-color-border: ${FILIKA_DESIGN_TOKENS.color.border};
  --filika-color-danger: ${FILIKA_DESIGN_TOKENS.color.danger};
  --filika-color-focus: ${FILIKA_DESIGN_TOKENS.color.focus};
  --filika-color-on-primary: ${FILIKA_DESIGN_TOKENS.color.onPrimary};
  --filika-color-primary: ${FILIKA_DESIGN_TOKENS.color.primary};
  --filika-color-surface: ${FILIKA_DESIGN_TOKENS.color.surface};
  --filika-color-surface-muted: ${FILIKA_DESIGN_TOKENS.color.surfaceMuted};
  --filika-color-text: ${FILIKA_DESIGN_TOKENS.color.text};
  --filika-color-text-muted: ${FILIKA_DESIGN_TOKENS.color.textMuted};
  --filika-focus-offset: ${FILIKA_DESIGN_TOKENS.focus.offset};
  --filika-focus-width: ${FILIKA_DESIGN_TOKENS.focus.width};
  --filika-motion-fast: ${FILIKA_DESIGN_TOKENS.motion.durationFast};
  --filika-motion-normal: ${FILIKA_DESIGN_TOKENS.motion.durationNormal};
  --filika-motion-easing: ${FILIKA_DESIGN_TOKENS.motion.easingStandard};
  --filika-dialog-bg: #ffffff;
  --filika-dialog-border: #e5e8ee;
  --filika-dialog-highlight: #ffffff;
  --filika-backdrop-bg: rgb(37 48 71 / 30%);
  --filika-input-bg: rgb(255 255 255 / 82%);
  --filika-input-border: #dfe4ed;
  --filika-privacy-bg: #edf2ff;
  --filika-error-summary-bg: rgb(255 241 242 / 76%);
  --filika-secondary-btn-bg: rgb(255 255 255 / 78%);
  color: var(--filika-color-text);
  color-scheme: light;
  font-family: ${FILIKA_DESIGN_TOKENS.typography.family};
  line-height: ${FILIKA_DESIGN_TOKENS.typography.lineHeight};
}

@media (prefers-reduced-motion: reduce) {
  :host {
    --filika-motion-fast: ${FILIKA_DESIGN_TOKENS.motion.reducedDuration};
    --filika-motion-normal: ${FILIKA_DESIGN_TOKENS.motion.reducedDuration};
  }
}
`;
