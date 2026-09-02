import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { AuthHeader } from "../src/auth/auth-header";
import { renderReact } from "./helpers/render-react";

describe("auth header component", () => {
  test("renders the brand and theme switcher supporting light, dark, and system", async () => {
    const result = await renderReact(createElement(AuthHeader));
    const header = result.container.querySelector("header.auth-header");
    expect(header).not.toBeNull();

    const brand = result.container.querySelector("a[href='/login']");
    expect(brand).not.toBeNull();

    const button = result.container.querySelector<HTMLButtonElement>("button.auth-theme");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("data-theme-choice")).toBe("light");
    expect(button?.getAttribute("aria-label")).toBe("Light theme");

    // Click → dark
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(button?.getAttribute("data-theme-choice")).toBe("dark");
    expect(button?.getAttribute("aria-label")).toBe("Dark theme");

    // Click → system
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(button?.getAttribute("data-theme-choice")).toBe("system");
    expect(button?.getAttribute("aria-label")).toBe("System theme");

    // Click → light
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(button?.getAttribute("data-theme-choice")).toBe("light");
    expect(button?.getAttribute("aria-label")).toBe("Light theme");

    await result.close();
  });
});
