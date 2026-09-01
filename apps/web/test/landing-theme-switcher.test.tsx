import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { ThemeSwitcher } from "../src/components/theme-switcher";
import { renderReact } from "./helpers/render-react";

describe("landing theme switcher component", () => {
  test("renders a single toggle button with accessible label and custom class", async () => {
    const result = await renderReact(
      createElement(ThemeSwitcher, { className: "custom-switcher" }),
    );
    const button = result.container.querySelector("button");
    expect(button?.className).toBe("custom-switcher");
    expect(button?.getAttribute("aria-label")).toBe("Light theme");
    expect(button?.getAttribute("data-theme-choice")).toBe("light");

    await result.close();
  });

  test("clicking cycles through light, dark, and system themes", async () => {
    const result = await renderReact(createElement(ThemeSwitcher));
    const themeColor = result.window.document.createElement("meta");
    themeColor.name = "theme-color";
    result.window.document.head.append(themeColor);

    const button = result.container.querySelector<HTMLButtonElement>("button")!;

    // Starts at light
    expect(button.getAttribute("data-theme-choice")).toBe("light");
    expect(button.getAttribute("aria-label")).toBe("Light theme");

    // Click → dark
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(button.getAttribute("data-theme-choice")).toBe("dark");
    expect(button.getAttribute("aria-label")).toBe("Dark theme");
    expect(result.window.document.documentElement.dataset.theme).toBe("dark");
    expect(themeColor.content).toBe("#0e0e10");
    expect(
      JSON.parse(result.window.localStorage.getItem("filika-workspace-v1") ?? "{}").theme,
    ).toBe("dark");

    // Click → system
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(button.getAttribute("data-theme-choice")).toBe("system");
    expect(button.getAttribute("aria-label")).toBe("System theme");
    expect(
      JSON.parse(result.window.localStorage.getItem("filika-workspace-v1") ?? "{}").theme,
    ).toBe("system");

    // Click → light again
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(button.getAttribute("data-theme-choice")).toBe("light");
    expect(button.getAttribute("aria-label")).toBe("Light theme");
    expect(result.window.document.documentElement.dataset.theme).toBe("light");
    expect(themeColor.content).toBe("#f7f8fa");

    await result.close();
  });

  test("system theme resolves via media query", async () => {
    const result = await renderReact(createElement(ThemeSwitcher));
    Object.defineProperty(result.window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: true }),
    });

    const button = result.container.querySelector<HTMLButtonElement>("button")!;

    // Click twice: light → dark → system
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(button.getAttribute("data-theme-choice")).toBe("system");
    expect(result.window.document.documentElement.dataset.theme).toBe("dark");
    expect(
      JSON.parse(result.window.localStorage.getItem("filika-workspace-v1") ?? "{}").theme,
    ).toBe("system");

    await result.close();
  });
});
