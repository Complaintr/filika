import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { DateRangeMenu } from "../app/[appSlug]/dashboard/page";
import { renderReact } from "./helpers/render-react";

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("dashboard date range menu", () => {
  test("shows the active range and opens a checked option list", async () => {
    const result = await renderReact(
      createElement(DateRangeMenu, { days: 30, onChange: () => {} }),
    );
    try {
      const trigger = result.container.querySelector<HTMLButtonElement>(".date-range-trigger");
      expect(trigger?.textContent).toContain("Last 30 days");
      expect(trigger?.getAttribute("aria-expanded")).toBe("false");

      trigger?.click();
      await settle();

      expect(trigger?.getAttribute("aria-expanded")).toBe("true");
      const items = Array.from(
        result.container.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
      );
      expect(items.map((item) => item.textContent?.trim())).toEqual([
        "Last 7 days",
        "Last 30 days",
        "Last 90 days",
      ]);
      expect(
        items.find((item) => item.getAttribute("aria-checked") === "true")?.textContent,
      ).toContain("Last 30 days");
    } finally {
      await result.close();
    }
  });

  test("selects a range, closes the menu, and reports the change", async () => {
    const changes: number[] = [];
    const result = await renderReact(
      createElement(DateRangeMenu, { days: 30, onChange: (days) => changes.push(days) }),
    );
    try {
      const trigger = result.container.querySelector<HTMLButtonElement>(".date-range-trigger");
      trigger?.click();
      await settle();
      const sevenDays = Array.from(
        result.container.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
      ).find((item) => item.textContent?.includes("Last 7 days"));
      sevenDays?.click();
      await settle();

      expect(changes).toEqual([7]);
      expect(result.container.querySelector('[role="menu"]')).toBeNull();
      expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    } finally {
      await result.close();
    }
  });

  test("closes on Escape and restores focus to the trigger", async () => {
    const result = await renderReact(createElement(DateRangeMenu, { days: 7, onChange: () => {} }));
    try {
      const trigger = result.container.querySelector<HTMLButtonElement>(".date-range-trigger");
      trigger?.click();
      await settle();
      result.window.document.dispatchEvent(
        new result.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      await settle();
      expect(result.container.querySelector('[role="menu"]')).toBeNull();
      expect(result.window.document.activeElement).toBe(trigger);
    } finally {
      await result.close();
    }
  });
});
