import { describe, expect, test } from "bun:test";

import {
  getOrCreateFilikaShadowRoot,
  STYLE_ISOLATION_DECISION,
} from "../src/foundation/style-isolation";

describe("style-isolation", () => {
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
    expect(receivedOptions!).toEqual({ mode: "open" });
  });
});
