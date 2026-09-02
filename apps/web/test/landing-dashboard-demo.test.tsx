import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { LandingDashboardDemo } from "../src/components/landing-dashboard-demo";
import { renderReact } from "./helpers/render-react";

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("landing dashboard demo", () => {
  test("opens the selected report inside the widget and returns focus when closed", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));
    const reportButton = result.container.querySelector<HTMLButtonElement>(
      'button[aria-label="View feedback: Payment form resets after validation"]',
    );
    expect(reportButton).not.toBeNull();

    reportButton?.click();
    await settle();

    const dialog = result.container.querySelector<HTMLDialogElement>("dialog");
    expect(dialog?.open).toBe(true);
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-labelledby")).toBe("landing-feedback-detail-title");
    expect(dialog?.textContent).toContain("Payment form resets after validation");
    expect(dialog?.textContent).toContain("Only the invalid card number should be cleared");
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
      'button[aria-label="View feedback: Team invite step cannot be completed"]',
    );
    const dialog = result.container.querySelector<HTMLDialogElement>("dialog");

    reportButton?.click();
    await settle();
    expect(dialog?.textContent).toContain("Team invite step cannot be completed");

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
