import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { LandingHeader } from "../src/components/landing-header";
import { renderReact } from "./helpers/render-react";

describe("landing header component", () => {
  test("renders logo, navigation links, theme switcher, and hidden header CTAs", async () => {
    const result = await renderReact(createElement(LandingHeader));

    const logo = result.container.querySelector('a[aria-label="Filika home"]');
    expect(logo).not.toBeNull();
    expect(logo?.textContent).toContain("Filika");

    const nav = result.container.querySelector('nav[aria-label="Main navigation"]');
    expect(nav).not.toBeNull();
    expect(nav?.textContent).toContain("Features");
    expect(nav?.textContent).toContain("How it works");
    expect(nav?.textContent).not.toContain("Docs");

    const switcher = result.container.querySelector('button[aria-label="Light theme"]');
    expect(switcher).not.toBeNull();

    const getStartedBtn = result.container.querySelector('a[href="/login"]');
    expect(getStartedBtn).not.toBeNull();
    expect(getStartedBtn?.textContent).toContain("Get Started");
    expect(getStartedBtn?.className).not.toContain("headerGetStartedVisible");
    expect(getStartedBtn?.getAttribute("tabindex")).toBe("-1");

    const demoBtn = result.container.querySelector('header a[href="/demo"]');
    expect(demoBtn).not.toBeNull();
    expect(demoBtn?.className).not.toContain("headerGetStartedVisible");
    expect(demoBtn?.getAttribute("tabindex")).toBe("-1");

    await result.close();
  });

  test("shows header CTAs after the hero scrolls out of view", async () => {
    const result = await renderReact(createElement(LandingHeader));
    const hero = result.window.document.createElement("section");
    hero.setAttribute("data-landing-hero", "");
    hero.getBoundingClientRect = () => ({ bottom: -1 }) as DOMRect;
    result.window.document.body.appendChild(hero);

    result.window.dispatchEvent(new result.window.Event("scroll"));
    await new Promise((resolve) => setTimeout(resolve, 20));

    const getStartedBtn = result.container.querySelector('a[href="/login"]');
    expect(getStartedBtn?.className).toContain("headerGetStartedVisible");
    expect(getStartedBtn?.hasAttribute("tabindex")).toBe(false);

    const demoBtn = result.container.querySelector('header a[href="/demo"]');
    expect(demoBtn?.className).toContain("headerGetStartedVisible");
    expect(demoBtn?.hasAttribute("tabindex")).toBe(false);

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

  test("keeps the scrolled state stable around the transition threshold", async () => {
    const result = await renderReact(createElement(LandingHeader));
    const wrapper = result.container.firstElementChild as HTMLElement;

    Object.defineProperty(result.window, "scrollY", {
      configurable: true,
      writable: true,
      value: 25,
    });
    result.window.dispatchEvent(new result.window.Event("scroll"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wrapper.className).toContain("headerWrapperScrolled");

    Object.defineProperty(result.window, "scrollY", { value: 15 });
    result.window.dispatchEvent(new result.window.Event("scroll"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wrapper.className).toContain("headerWrapperScrolled");

    Object.defineProperty(result.window, "scrollY", { value: 5 });
    result.window.dispatchEvent(new result.window.Event("scroll"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(wrapper.className).not.toContain("headerWrapperScrolled");

    await result.close();
  });

  test("brand link glides back to the top of the page", async () => {
    const result = await renderReact(createElement(LandingHeader));
    const calls: { top: number; behavior?: ScrollBehavior }[] = [];
    result.window.scrollTo = ((options?: ScrollToOptions) => {
      calls.push({ top: options?.top ?? 0, behavior: options?.behavior });
    }) as typeof result.window.scrollTo;

    const logo = result.container.querySelector<HTMLAnchorElement>('a[aria-label="Filika home"]');
    logo?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(calls).toContainEqual({ top: 0, behavior: "smooth" });
    await result.close();
  });

  test("navigation links move to the matching section", async () => {
    const result = await renderReact(createElement(LandingHeader));

    const featuresLink =
      result.container.querySelector<HTMLAnchorElement>('nav a[href="#features"]');
    featuresLink?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.window.location.hash).toBe("#features");

    const howLink = result.container.querySelector<HTMLAnchorElement>(
      'nav a[href="#how-it-works"]',
    );
    howLink?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.window.location.hash).toBe("#how-it-works");

    await result.close();
  });

  test("mobile menu button toggles the drawer with navigation links", async () => {
    const result = await renderReact(createElement(LandingHeader));

    const menuBtn = result.container.querySelector('button[aria-label="Open menu"]');
    expect(menuBtn).not.toBeNull();
    expect(menuBtn?.getAttribute("aria-expanded")).toBe("false");

    const mobileNav = result.container.querySelector('nav[aria-label="Mobile navigation"]');
    expect(mobileNav).not.toBeNull();
    expect(mobileNav?.textContent).toContain("Features");
    expect(mobileNav?.textContent).toContain("How it works");
    expect(mobileNav?.textContent).toContain("GitHub");
    expect(mobileNav?.textContent).not.toContain("Demo");
    expect(mobileNav?.textContent).not.toContain("Get Started");
    expect(mobileNav?.querySelector('a[href="/demo"]')).toBeNull();
    expect(mobileNav?.querySelector('a[href="/login"]')).toBeNull();

    menuBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(menuBtn?.getAttribute("aria-label")).toBe("Close menu");
    expect(menuBtn?.getAttribute("aria-expanded")).toBe("true");

    const featuresButton = mobileNav?.querySelector("button");
    expect(featuresButton).not.toBeNull();
    featuresButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(menuBtn?.getAttribute("aria-label")).toBe("Open menu");
    expect(menuBtn?.getAttribute("aria-expanded")).toBe("false");

    await result.close();
  });
});
