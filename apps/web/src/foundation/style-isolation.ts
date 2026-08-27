export const STYLE_ISOLATION_DECISION = {
  boundary: "shadow_dom",
  cssEntry: "FILIKA_TOKEN_CSS",
  hostElement: "filika-feedback-root",
  mode: "open",
  rules: [
    "Place every Filika dialog node and style inside the shadow root.",
    "Use Filika-prefixed custom properties defined on :host.",
    "Do not read host-page class names or copy host-page computed styles.",
    "Portal only within the shadow root; do not append dialog nodes to document.body.",
  ],
} as const;

export function getOrCreateFilikaShadowRoot(host: HTMLElement): ShadowRoot {
  if (host.shadowRoot !== null) {
    return host.shadowRoot;
  }

  return host.attachShadow({ mode: STYLE_ISOLATION_DECISION.mode });
}
