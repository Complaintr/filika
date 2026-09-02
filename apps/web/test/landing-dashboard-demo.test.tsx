import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { LandingDashboardDemo } from "../src/components/landing-dashboard-demo";
import { renderReact } from "./helpers/render-react";

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("landing dashboard demo", () => {
  test("renders the Filika demo identity and full-size activity chart", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));

    const logo = result.container.querySelector('img[src="/filika-logo.svg"]');
    expect(logo).not.toBeNull();
    expect(result.container.textContent).toContain("Filika Demo");

    const chart = result.container.querySelector('svg[aria-label*="last 30 days"]');
    expect(chart?.getAttribute("data-free-size")).toBe("true");
    expect(chart?.querySelectorAll("path").length).toBe(2);

    await result.close();
  });

  test("opens the selected report inside the widget and returns focus when closed", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));
    const reportButton = result.container.querySelector<HTMLButtonElement>(
      'button[aria-label="View feedback: Export button stops responding after filtering"]',
    );
    expect(reportButton).not.toBeNull();

    reportButton?.click();
    await settle();

    const dialog = result.container.querySelector<HTMLDialogElement>("dialog");
    expect(dialog?.open).toBe(true);
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-labelledby")).toBe("landing-feedback-detail-title");
    expect(dialog?.textContent).toContain("Export button stops responding after filtering");
    expect(dialog?.textContent).toContain("Export should download the currently filtered");
    expect(dialog?.textContent).toContain("No data is sent");

    const closeButton = dialog?.querySelector<HTMLButtonElement>(
      'button[aria-label="Close feedback details"]',
    );
    expect(result.window.document.activeElement).toBe(closeButton);
    closeButton?.click();
    await settle();

    expect(dialog?.open).toBe(false);
    expect(result.window.document.activeElement).toBe(reportButton);
    await result.close();
  });

  test("supports native cancel and backdrop dismissal without making network requests", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));
    const reportButton = result.container.querySelector<HTMLButtonElement>(
      'button[aria-label="View feedback: Navigation label does not match the destination"]',
    );
    const dialog = result.container.querySelector<HTMLDialogElement>("dialog");

    reportButton?.click();
    await settle();
    expect(dialog?.textContent).toContain("Navigation label does not match the destination");

    dialog?.dispatchEvent(new result.window.Event("cancel", { cancelable: true }));
    await settle();
    expect(dialog?.open).toBe(false);
    expect(result.window.document.activeElement).toBe(reportButton);

    reportButton?.click();
    await settle();
    dialog?.dispatchEvent(new result.window.Event("pointerdown", { bubbles: true }));
    await settle();
    expect(dialog?.open).toBe(false);

    await result.close();
  });
});
