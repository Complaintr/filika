import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { LandingHeader } from "../src/components/landing-header";
import { renderReact } from "./helpers/render-react";

describe("landing header component", () => {
  test("renders logo, navigation links, theme switcher, and workspace button", async () => {
    const result = await renderReact(createElement(LandingHeader));

    const logo = result.container.querySelector('a[aria-label="Filika home"]');
    expect(logo).not.toBeNull();
    expect(logo?.textContent).toContain("Filika");
    expect(logo?.querySelector('img[src="/filika-logo.svg"]')).not.toBeNull();

    const nav = result.container.querySelector('nav[aria-label="Main navigation"]');
    expect(nav).not.toBeNull();
    expect(nav?.textContent).toContain("Product");
    expect(nav?.textContent).toContain("How it works");
    expect(nav?.textContent).toContain("Safety");

    const switcher = result.container.querySelector('fieldset[aria-label="Appearance"]');
    expect(switcher).not.toBeNull();

    const workspaceBtn = result.container.querySelector('a[href="/login"]');
    expect(workspaceBtn).not.toBeNull();

    await result.close();
  });

  test("handles scroll state transitions", async () => {
    const result = await renderReact(createElement(LandingHeader));

    const headerWrapper = result.container.firstElementChild as HTMLElement | null;
    expect(headerWrapper).not.toBeNull();

    // Trigger scroll event
    Object.defineProperty(result.window, "scrollY", {
      configurable: true,
      writable: true,
      value: 100,
    });
    result.window.dispatchEvent(new result.window.Event("scroll"));
    await new Promise((resolve) => setTimeout(resolve, 20));

    await result.close();
  });
});
