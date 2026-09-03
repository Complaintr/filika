import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { LandingDashboardDemo } from "../src/components/landing-dashboard-demo";
import { renderReact } from "./helpers/render-react";

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("landing dashboard demo", () => {
  test("mirrors the workspace dashboard metrics, chart, and category breakdown", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));

    const logo = result.container.querySelector('img[src="/filika-logo.svg"]');
    expect(logo).not.toBeNull();
    expect(result.container.textContent).toContain("Filika Demo");
    expect(result.container.textContent).not.toContain("Collector connected");
    const metrics = Array.from(result.container.querySelectorAll("article")).map((card) => ({
      label: card.querySelector("span")?.firstChild?.textContent?.trim(),
      value: card.querySelector("strong")?.textContent,
    }));
    expect(metrics).toEqual([
      { label: "Total complaints", value: "220" },
      { label: "Bug reports", value: "81" },
      { label: "Blocked tasks", value: "55" },
      { label: "Ideas", value: "38" },
    ]);
    expect(result.container.textContent).toContain("By feedback type");
    expect(result.container.textContent).toContain("Confusing behavior");
    expect(
      result.container.querySelectorAll('button[aria-label^="View "][aria-label$=" complaints"]'),
    ).toHaveLength(4);

    const chart = result.container.querySelector('svg[aria-label*="last 30 days"]');
    expect(chart?.getAttribute("data-free-size")).toBe("true");
    expect(chart?.getAttribute("aria-label")).toBe("220 complaints over the last 30 days");
    expect(chart?.querySelectorAll("path").length).toBe(1);
    expect(chart?.querySelector("path")?.getAttribute("d")).toContain("C");

    await result.close();
  });

  test("switches the date range and updates the dashboard metrics", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));
    const trigger = result.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Dashboard date range"]',
    );
    expect(trigger?.textContent).toContain("Last 30 days");
    trigger?.click();
    await settle();

    const sevenDays = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
    ).find((item) => item.textContent?.includes("Last 7 days"));
    expect(sevenDays).not.toBeNull();
    sevenDays?.click();
    await settle();

    expect(trigger?.textContent).toContain("Last 7 days");
    const metrics = Array.from(result.container.querySelectorAll("article")).map((card) => ({
      label: card.querySelector("span")?.firstChild?.textContent?.trim(),
      value: card.querySelector("strong")?.textContent,
    }));
    expect(metrics).toEqual([
      { label: "Total complaints", value: "58" },
      { label: "Bug reports", value: "21" },
      { label: "Blocked tasks", value: "15" },
      { label: "Ideas", value: "10" },
    ]);
    const chart = result.container.querySelector('svg[aria-label*="last 7 days"]');
    expect(chart?.getAttribute("aria-label")).toBe("58 complaints over the last 7 days");
    await result.close();
  });

  test("opens the selected report inside the widget and returns focus when closed", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));
    result.container
      .querySelector<HTMLButtonElement>('button[aria-label="View Bug report complaints"]')
      ?.click();
    await settle();
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
    expect(dialog?.textContent).toContain("Report content");
    expect(dialog?.textContent).toContain("External content is untrusted");
    expect(dialog?.textContent).toContain("Back to complaints");

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

  test("preview navigation wraps through the visible reports", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));
    result.container
      .querySelector<HTMLButtonElement>('button[aria-label="View Bug report complaints"]')
      ?.click();
    await settle();
    const reportButton = result.container.querySelector<HTMLButtonElement>(
      'button[aria-label="View feedback: Export button stops responding after filtering"]',
    );
    reportButton?.click();
    await settle();

    const dialog = result.container.querySelector<HTMLDialogElement>("dialog");
    const next = dialog?.querySelector<HTMLButtonElement>(
      'button[aria-label="Next preview report"]',
    );
    const previous = dialog?.querySelector<HTMLButtonElement>(
      'button[aria-label="Previous preview report"]',
    );
    // The bug filter holds a single report, so navigation stays disabled.
    expect(next?.disabled).toBe(true);
    expect(previous?.disabled).toBe(true);

    const allFilter = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
    ).find((button) => button.textContent?.includes("All complaints"));
    allFilter?.click();
    await settle();

    reportButton?.click();
    await settle();
    expect(next?.disabled).toBe(false);

    next?.click();
    await settle();
    expect(dialog?.textContent).toContain("Navigation label does not match the destination");

    previous?.click();
    await settle();
    expect(dialog?.textContent).toContain("Export button stops responding after filtering");

    await result.close();
  });

  test("refresh inbox reorders the demo reports and clears the active filter", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));
    result.container
      .querySelector<HTMLButtonElement>('button[aria-label="View Bug report complaints"]')
      ?.click();
    await settle();

    const refresh = Array.from(result.container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.includes("Refresh inbox"),
    );
    expect(refresh).toBeDefined();
    refresh?.click();
    await settle();

    const allFilter = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
    ).find((button) => button.textContent?.includes("All complaints"));
    expect(allFilter?.getAttribute("aria-pressed")).toBe("true");
    expect(
      result.container.querySelectorAll<HTMLButtonElement>('button[aria-label^="View feedback:"]'),
    ).toHaveLength(4);

    await result.close();
  });

  test("supports native cancel and backdrop dismissal without making network requests", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));
    result.container
      .querySelector<HTMLButtonElement>('button[aria-label="View Confusing behavior complaints"]')
      ?.click();
    await settle();
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

  test("filters the complaints demo and returns focus to the dashboard category", async () => {
    const result = await renderReact(createElement(LandingDashboardDemo));
    const ideaCategory = result.container.querySelector<HTMLButtonElement>(
      'button[aria-label="View Idea complaints"]',
    );
    ideaCategory?.click();
    await settle();

    const complaintsView = result.container.querySelector('[data-demo-view="complaints"]');
    expect(complaintsView).not.toBeNull();
    expect(complaintsView?.textContent).toContain("All complaints");
    expect(complaintsView?.querySelector('input[placeholder="Search complaints…"]')).not.toBeNull();
    expect(complaintsView?.textContent).toContain("Newest first");
    expect(complaintsView?.textContent).toContain("Allow reports to be duplicated");
    expect(complaintsView?.textContent).not.toContain(
      "Export button stops responding after filtering",
    );

    const allFilter = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
    ).find((button) => button.textContent?.includes("All complaints"));
    allFilter?.click();
    await settle();
    expect(
      result.container.querySelectorAll<HTMLButtonElement>('button[aria-label^="View feedback:"]'),
    ).toHaveLength(4);

    const bugFilter = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
    ).find((button) => button.textContent?.includes("Bugs"));
    bugFilter?.click();
    await settle();
    const filteredView = result.container.querySelector('[data-demo-view="complaints"]');
    expect(filteredView?.textContent).toContain("Export button stops responding after filtering");
    expect(filteredView?.textContent).not.toContain("Allow reports to be duplicated");

    const back = Array.from(result.container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.includes("Back to dashboard"),
    );
    back?.click();
    await settle();
    expect(result.container.querySelector('[data-demo-view="dashboard"]')).not.toBeNull();
    const restoredIdeaCategory = result.container.querySelector<HTMLButtonElement>(
      'button[aria-label="View Idea complaints"]',
    );
    expect(result.window.document.activeElement).toBe(restoredIdeaCategory);

    await result.close();
  });
});
