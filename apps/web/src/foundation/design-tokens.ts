export const FILIKA_DESIGN_TOKENS = {
  color: {
    accent: "#c7f36b",
    border: "#c9d4cd",
    danger: "#9f2633",
    focus: "#643cff",
    onPrimary: "#ffffff",
    primary: "#145c3a",
    surface: "#ffffff",
    surfaceMuted: "#f3f7f4",
    text: "#17211b",
    textMuted: "#536159",
  },
  focus: {
    offset: "3px",
    width: "3px",
  },
  motion: {
    durationFast: "120ms",
    durationNormal: "180ms",
    easingStandard: "cubic-bezier(0.2, 0, 0, 1)",
    reducedDuration: "0ms",
  },
  radius: {
    control: "0.625rem",
    panel: "1rem",
    pill: "999px",
  },
  spacing: {
    lg: "1.5rem",
    md: "1rem",
    sm: "0.75rem",
    xl: "2rem",
    xs: "0.5rem",
  },
  typography: {
    body: "1rem",
    family:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    heading: "1.5rem",
    lineHeight: "1.5",
    small: "0.875rem",
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
