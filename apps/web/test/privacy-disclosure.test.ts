import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

import { FILIKA_PRIVACY_DISCLOSURE, renderPrivacyNotice } from "../src/foundation/privacy-notice";

function setupDom() {
  const window = new Window({ url: "http://localhost:4173" });
  const document = window.document as unknown as Document;
  return { document, window };
}

describe("privacy disclosure and data classification", () => {
  test("privacy disclosure defines accurate collected, optional, excluded, and retained categories", () => {
    const { collected, excluded, optional, retained } = FILIKA_PRIVACY_DISCLOSURE;

    expect(collected.title).toContain("Collected");
    expect(collected.items.some((i) => i.includes("kind, title, and description"))).toBe(true);
    expect(collected.items.some((i) => i.includes("SDK version"))).toBe(true);
    expect(collected.items.some((i) => i.includes("Server-derived request facts"))).toBe(true);

    expect(optional.title).toContain("Optional");
    expect(optional.items.some((i) => i.includes("Expected behavior and steps"))).toBe(true);
    expect(optional.items.some((i) => i.includes("route label"))).toBe(true);
    expect(optional.items.some((i) => i.includes("application release"))).toBe(true);

    expect(excluded.title).toContain("not collected automatically");
    expect(excluded.items.some((i) => i.includes("Passwords") || i.includes("credentials"))).toBe(
      true,
    );
    expect(excluded.items.some((i) => i.includes("cookies") || i.includes("storage"))).toBe(true);
    expect(
      excluded.items.some((i) => i.includes("Browsing history") || i.includes("full DOM")),
    ).toBe(true);
    expect(excluded.items.some((i) => i.includes("Screenshots"))).toBe(true);

    expect(retained.title).toContain("Retained");
    expect(retained.items.some((i) => i.includes("24 hours"))).toBe(true);
  });

  test("renderPrivacyNotice creates accessible section with heading and all category cards", () => {
    const { document } = setupDom();
    const section = renderPrivacyNotice(document);

    expect(section.id).toBe("privacy");
    expect(section.getAttribute("aria-labelledby")).toBe("privacy-notice-title");

    const heading = section.querySelector("#privacy-notice-title");
    expect(heading?.textContent).toBe("Privacy and Data Handling Notice");

    const cards = section.querySelectorAll(".privacy-category-card");
    expect(cards.length).toBe(4);

    const cardHeadings = Array.from(cards).map((c) => c.querySelector("h3")?.textContent);
    expect(cardHeadings).toContain("Collected data");
    expect(cardHeadings).toContain("Optional data");
    expect(cardHeadings).toContain("Data not collected automatically");
    expect(cardHeadings).toContain("Retained data and cleanup");
  });

  test("privacy copy describes manual cleanup, public access, and user-supplied secrets honestly", () => {
    const { document } = setupDom();
    const text = renderPrivacyNotice(document).textContent ?? "";
    expect(text).toContain("bun run db:cleanup");
    expect(text).toContain("No automatic cleanup scheduler");
    expect(text).toContain("public inbox until cleanup runs");
    expect(text).toContain("Do not include secrets or personal data");
    expect(text).not.toMatch(/maximum of 24|automated purge|never collected|Strictly blocked/i);
  });
});
