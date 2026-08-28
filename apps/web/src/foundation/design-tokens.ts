export const FILIKA_DESIGN_TOKENS = {
  color: {
    accent: "#2dd4bf",
    border: "#91d5cc",
    danger: "#9f2633",
    focus: "#0e7490",
    onPrimary: "#ffffff",
    primary: "#0f766e",
    surface: "#ffffff",
    surfaceMuted: "#e8faf7",
    text: "#123330",
    textMuted: "#476966",
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
    control: "14px",
    panel: "24px",
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
    family:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif',
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
  --filika-dialog-bg: rgb(255 255 255 / 96%);
  --filika-dialog-border: rgb(255 255 255 / 88%);
  --filika-dialog-highlight: #ffffff;
  --filika-backdrop-bg: rgb(13 49 46 / 34%);
  --filika-input-bg: rgb(255 255 255 / 82%);
  --filika-input-border: rgb(15 118 110 / 18%);
  --filika-privacy-bg: rgb(232 250 247 / 64%);
  --filika-error-summary-bg: rgb(255 241 242 / 76%);
  --filika-secondary-btn-bg: rgb(255 255 255 / 78%);
  color: var(--filika-color-text);
  color-scheme: light dark;
  font-family: ${FILIKA_DESIGN_TOKENS.typography.family};
  line-height: ${FILIKA_DESIGN_TOKENS.typography.lineHeight};
}

@media (prefers-color-scheme: dark) {
  :host {
    --filika-color-surface: #18181b;
    --filika-color-surface-muted: #27272a;
    --filika-color-text: #f4f4f5;
    --filika-color-text-muted: #a1a1aa;
    --filika-color-border: #3f3f46;
    --filika-color-accent: #2dd4bf;
    --filika-color-primary: #14b8a6;
    --filika-color-on-primary: #042f2e;
    --filika-color-focus: #2dd4bf;
    --filika-color-danger: #f87171;
    --filika-dialog-bg: rgba(24, 24, 27, 0.96);
    --filika-dialog-border: rgba(255, 255, 255, 0.12);
    --filika-dialog-highlight: rgba(255, 255, 255, 0.08);
    --filika-backdrop-bg: rgba(0, 0, 0, 0.65);
    --filika-input-bg: rgba(39, 39, 42, 0.7);
    --filika-input-border: rgba(255, 255, 255, 0.14);
    --filika-privacy-bg: rgba(20, 184, 166, 0.1);
    --filika-error-summary-bg: rgba(239, 68, 68, 0.16);
    --filika-secondary-btn-bg: rgba(39, 39, 42, 0.8);
  }
}

:host-context([data-theme="dark"]),
:host([data-theme="dark"]) {
  --filika-color-surface: #18181b;
  --filika-color-surface-muted: #27272a;
  --filika-color-text: #f4f4f5;
  --filika-color-text-muted: #a1a1aa;
  --filika-color-border: #3f3f46;
  --filika-color-accent: #2dd4bf;
  --filika-color-primary: #14b8a6;
  --filika-color-on-primary: #042f2e;
  --filika-color-focus: #2dd4bf;
  --filika-color-danger: #f87171;
  --filika-dialog-bg: rgba(24, 24, 27, 0.96);
  --filika-dialog-border: rgba(255, 255, 255, 0.12);
  --filika-dialog-highlight: rgba(255, 255, 255, 0.08);
  --filika-backdrop-bg: rgba(0, 0, 0, 0.65);
  --filika-input-bg: rgba(39, 39, 42, 0.7);
  --filika-input-border: rgba(255, 255, 255, 0.14);
  --filika-privacy-bg: rgba(20, 184, 166, 0.1);
  --filika-error-summary-bg: rgba(239, 68, 68, 0.16);
  --filika-secondary-btn-bg: rgba(39, 39, 42, 0.8);
}

:host-context([data-theme="light"]),
:host([data-theme="light"]) {
  --filika-color-surface: ${FILIKA_DESIGN_TOKENS.color.surface};
  --filika-color-surface-muted: ${FILIKA_DESIGN_TOKENS.color.surfaceMuted};
  --filika-color-text: ${FILIKA_DESIGN_TOKENS.color.text};
  --filika-color-text-muted: ${FILIKA_DESIGN_TOKENS.color.textMuted};
  --filika-color-border: ${FILIKA_DESIGN_TOKENS.color.border};
  --filika-color-accent: ${FILIKA_DESIGN_TOKENS.color.accent};
  --filika-color-primary: ${FILIKA_DESIGN_TOKENS.color.primary};
  --filika-color-on-primary: ${FILIKA_DESIGN_TOKENS.color.onPrimary};
  --filika-color-focus: ${FILIKA_DESIGN_TOKENS.color.focus};
  --filika-color-danger: ${FILIKA_DESIGN_TOKENS.color.danger};
  --filika-dialog-bg: rgb(255 255 255 / 96%);
  --filika-dialog-border: rgb(255 255 255 / 88%);
  --filika-dialog-highlight: #ffffff;
  --filika-backdrop-bg: rgb(13 49 46 / 34%);
  --filika-input-bg: rgb(255 255 255 / 82%);
  --filika-input-border: rgb(15 118 110 / 18%);
  --filika-privacy-bg: rgb(232 250 247 / 64%);
  --filika-error-summary-bg: rgb(255 241 242 / 76%);
  --filika-secondary-btn-bg: rgb(255 255 255 / 78%);
}

@media (prefers-reduced-motion: reduce) {
  :host {
    --filika-motion-fast: ${FILIKA_DESIGN_TOKENS.motion.reducedDuration};
    --filika-motion-normal: ${FILIKA_DESIGN_TOKENS.motion.reducedDuration};
  }
}
`;
