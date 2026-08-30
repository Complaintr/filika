import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { ThemeSwitcher } from "../src/components/theme-switcher";
import { renderReact } from "./helpers/render-react";

describe("landing theme switcher component", () => {
  test("renders light, dark, and system options with accessible labels", async () => {
    const result = await renderReact(
      createElement(ThemeSwitcher, { className: "custom-switcher" }),
    );
    const fieldset = result.container.querySelector("fieldset");
    expect(fieldset?.className).toBe("custom-switcher");

    const light = result.container.querySelector<HTMLButtonElement>('[aria-label="Light theme"]');
    const dark = result.container.querySelector<HTMLButtonElement>('[aria-label="Dark theme"]');
    const system = result.container.querySelector<HTMLButtonElement>('[aria-label="System theme"]');

    expect(light).not.toBeNull();
    expect(dark).not.toBeNull();
    expect(system).not.toBeNull();

    await result.close();
  });

  test("switching to dark theme applies dataset and meta tag and persists preference", async () => {
    const result = await renderReact(createElement(ThemeSwitcher));
    const themeColor = result.window.document.createElement("meta");
    themeColor.name = "theme-color";
    result.window.document.head.append(themeColor);

    const dark = result.container.querySelector<HTMLButtonElement>('[aria-label="Dark theme"]');
    dark?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(dark?.getAttribute("aria-checked")).toBe("true");
    expect(result.window.document.documentElement.dataset.theme).toBe("dark");
    expect(themeColor.content).toBe("#0e0e10");
    expect(
      JSON.parse(result.window.localStorage.getItem("filika-workspace-v1") ?? "{}").theme,
    ).toBe("dark");

    const light = result.container.querySelector<HTMLButtonElement>('[aria-label="Light theme"]');
    light?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(light?.getAttribute("aria-checked")).toBe("true");
    expect(result.window.document.documentElement.dataset.theme).toBe("light");
    expect(themeColor.content).toBe("#f7f8fa");
    expect(
      JSON.parse(result.window.localStorage.getItem("filika-workspace-v1") ?? "{}").theme,
    ).toBe("light");

    await result.close();
  });

  test("switching to system theme resolves system media query and persists preference", async () => {
    const result = await renderReact(createElement(ThemeSwitcher));
    Object.defineProperty(result.window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: true }),
    });

    const system = result.container.querySelector<HTMLButtonElement>('[aria-label="System theme"]');
    system?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(system?.getAttribute("aria-checked")).toBe("true");
    expect(result.window.document.documentElement.dataset.theme).toBe("dark");
    expect(
      JSON.parse(result.window.localStorage.getItem("filika-workspace-v1") ?? "{}").theme,
    ).toBe("system");

    await result.close();
  });
});
