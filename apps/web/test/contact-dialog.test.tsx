import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { ContactLink } from "../src/components/contact-dialog";
import { renderReact } from "./helpers/render-react";

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("contact dialog", () => {
  test("opens on Contact and lists both email addresses", async () => {
    const result = await renderReact(createElement(ContactLink));
    const trigger = Array.from(result.container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent === "Contact",
    );
    expect(trigger).not.toBeNull();
    trigger?.click();
    await settle();

    const dialog = result.container.querySelector<HTMLDialogElement>("dialog");
    expect(dialog?.open).toBe(true);
    expect(dialog?.textContent).toContain("Contact Filika");
    expect(dialog?.textContent).toContain("Filika");
    expect(dialog?.textContent).toContain("filika@complaintr.com");
    expect(dialog?.textContent).not.toContain("mail@complaintr.com");
    expect(dialog?.textContent).toContain("Send email");
    expect(dialog?.textContent).toContain("Copy email");
    expect(
      dialog?.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:filika@complaintr.com"]'),
    ).toHaveLength(2);
    expect(dialog?.querySelectorAll<HTMLButtonElement>('button[aria-label^="Copy "]')).toHaveLength(
      1,
    );
    await result.close();
  });

  test("copies the primary email and reports the status", async () => {
    const result = await renderReact(createElement(ContactLink));
    const written: string[] = [];
    Object.defineProperty(result.window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          written.push(text);
        },
      },
    });

    const trigger = Array.from(result.container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent === "Contact",
    );
    trigger?.click();
    await settle();

    const copyButton = Array.from(
      result.container.querySelectorAll<HTMLButtonElement>("button[aria-label]"),
    ).find((button) => button.getAttribute("aria-label") === "Copy filika@complaintr.com");
    expect(copyButton).not.toBeNull();
    copyButton?.click();
    await settle();

    expect(written).toContain("filika@complaintr.com");
    expect(result.container.textContent).toContain("filika@complaintr.com copied");
    await result.close();
  });

  test("closes on cancel and returns focus to the trigger", async () => {
    const result = await renderReact(createElement(ContactLink));
    const trigger = Array.from(result.container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent === "Contact",
    );
    trigger?.click();
    await settle();

    const dialog = result.container.querySelector<HTMLDialogElement>("dialog");
    dialog?.dispatchEvent(new result.window.Event("cancel", { cancelable: true }));
    await settle();

    expect(dialog?.open).toBe(false);
    expect(result.window.document.activeElement).toBe(trigger);
    await result.close();
  });
});
