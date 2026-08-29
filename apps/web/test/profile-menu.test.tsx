import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { ProfileMenu } from "../src/workspace/profile-menu";
import { renderReact } from "./helpers/render-react";

describe("header profile menu", () => {
  test("opens from the header trigger without rendering other accounts", async () => {
    const result = await renderReact(createElement(ProfileMenu, { workspaceName: "My workspace" }));
    const trigger = result.container.querySelector<HTMLButtonElement>(
      '[aria-label="Open profile menu"]',
    );

    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(result.container.querySelector('[role="menu"]')).not.toBeNull();
    expect(result.container.textContent).toContain("Manage profile");
    expect(result.container.textContent).toContain("Settings");
    expect(result.container.textContent).toContain("Sign out");
    expect(result.container.textContent).not.toContain("Other Accounts");

    await result.close();
  });

  test("escape closes the menu and restores focus to its trigger", async () => {
    const result = await renderReact(createElement(ProfileMenu, { workspaceName: "Filika" }));
    const trigger = result.container.querySelector<HTMLButtonElement>(
      '[aria-label="Open profile menu"]',
    );
    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    result.window.document.dispatchEvent(
      new result.window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.container.querySelector('[role="menu"]')).toBeNull();
    expect(result.window.document.activeElement).toBe(trigger);

    await result.close();
  });

  test("an outside pointer closes the open menu", async () => {
    const result = await renderReact(createElement(ProfileMenu, { workspaceName: "Filika" }));
    const trigger = result.container.querySelector<HTMLButtonElement>(
      '[aria-label="Open profile menu"]',
    );
    trigger?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    result.window.document.body.dispatchEvent(
      new result.window.Event("pointerdown", { bubbles: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.container.querySelector('[role="menu"]')).toBeNull();

    await result.close();
  });
});
