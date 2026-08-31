import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { LandingHeader } from "../src/components/landing-header";
import { renderReact } from "./helpers/render-react";

describe("landing header component", () => {
  test("renders logo, navigation links, theme switcher, and get started button", async () => {
    const result = await renderReact(createElement(LandingHeader));

    const logo = result.container.querySelector('a[aria-label="Filika home"]');
    expect(logo).not.toBeNull();
    expect(logo?.textContent).toContain("Filika");

    const nav = result.container.querySelector('nav[aria-label="Main navigation"]');
    expect(nav).not.toBeNull();
    expect(nav?.textContent).toContain("Features");
    expect(nav?.textContent).toContain("How it works");
    expect(nav?.textContent).toContain("Docs");

    const switcher = result.container.querySelector('fieldset[aria-label="Appearance"]');
    expect(switcher).not.toBeNull();

    const getStartedBtn = result.container.querySelector('a[href="/login"]');
    expect(getStartedBtn).not.toBeNull();
    expect(getStartedBtn?.textContent).toContain("Get Started");

    await result.close();
  });

  test("applies scrolled island classes when window scroll exceeds threshold", async () => {
    const result = await renderReact(createElement(LandingHeader));

    const wrapper = result.container.firstElementChild as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).not.toContain("headerWrapperScrolled");

    Object.defineProperty(result.window, "scrollY", {
      configurable: true,
      writable: true,
      value: 100,
    });
    result.window.dispatchEvent(new result.window.Event("scroll"));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(wrapper.className).toContain("headerWrapperScrolled");

    await result.close();
  });
});
