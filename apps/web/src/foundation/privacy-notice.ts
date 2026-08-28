export interface PrivacyDataCategory {
  title: string;
  items: readonly string[];
}

export interface PrivacyDisclosure {
  collected: PrivacyDataCategory;
  optional: PrivacyDataCategory;
  excluded: PrivacyDataCategory;
  retained: PrivacyDataCategory;
}

export const FILIKA_PRIVACY_DISCLOSURE: PrivacyDisclosure = {
  collected: {
    title: "Collected data",
    items: [
      "Feedback report content: kind, title, and description.",
      "SDK version from fixed client configuration.",
      "Project key, protocol version, and a generated event ID for duplicate detection.",
      "Server-derived request facts: request origin, received timestamp, and feedback ID.",
      "Source label identifying unverified web SDK submissions.",
    ],
  },
  optional: {
    title: "Optional data",
    items: [
      "Expected behavior and steps to reproduce (can be left blank).",
      "Host-supplied context: route label (page name) and application release.",
      "Any optional field can be removed or edited before confirming submission.",
    ],
  },
  excluded: {
    title: "Data not collected automatically",
    items: [
      "Passwords, access tokens, API keys, or credentials are not read automatically. Do not include secrets or personal data in your report.",
      "Browser cookies, session storage, or local storage data.",
      "Browsing history, full DOM contents, or ambient page text.",
      "Screenshots, audio, video, or location information.",
    ],
  },
  retained: {
    title: "Retained data and cleanup",
    items: [
      "Demo feedback becomes eligible for deletion after 24 hours.",
      "A maintainer must run bun run db:cleanup to delete expired records. No automatic cleanup scheduler is configured.",
      "Feedback remains stored and accessible through the public inbox until cleanup runs. Use synthetic data only.",
      "No permanent analytics or third-party tracking identifiers are stored.",
    ],
  },
};

export function renderPrivacyNotice(document: Document): HTMLElement {
  const section = document.createElement("section");
  section.id = "privacy";
  section.className = "privacy-notice-panel";
  section.setAttribute("aria-labelledby", "privacy-notice-title");

  const header = document.createElement("header");
  header.className = "privacy-notice-header";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Data safety & transparency";

  const title = document.createElement("h2");
  title.id = "privacy-notice-title";
  title.textContent = "Privacy and Data Handling Notice";

  const lede = document.createElement("p");
  lede.className = "lede";
  lede.textContent =
    "Review the report and optional context before sending. The SDK does not capture ambient page data. Reports in this demo are public; use synthetic data only.";

  const trustBadges = document.createElement("div");
  trustBadges.className = "privacy-trust-badges";
  const badges = [
    "Zero ambient telemetry",
    "Explicit user review",
    "Cleanup after 24h",
    "No cookies or DOM capture",
  ];
  for (const label of badges) {
    const badge = document.createElement("span");
    badge.className = "trust-badge";
    badge.textContent = label;
    trustBadges.append(badge);
  }

  header.append(eyebrow, title, lede, trustBadges);
  section.append(header);

  const grid = document.createElement("div");
  grid.className = "privacy-categories-grid";

  const categories: Array<{
    key: "collected" | "optional" | "excluded" | "retained";
    category: PrivacyDataCategory;
    tag: string;
  }> = [
    { key: "collected", category: FILIKA_PRIVACY_DISCLOSURE.collected, tag: "Report payload" },
    { key: "optional", category: FILIKA_PRIVACY_DISCLOSURE.optional, tag: "User editable" },
    { key: "excluded", category: FILIKA_PRIVACY_DISCLOSURE.excluded, tag: "No automatic capture" },
    { key: "retained", category: FILIKA_PRIVACY_DISCLOSURE.retained, tag: "Maintainer cleanup" },
  ];

  for (const { key, category, tag } of categories) {
    const card = document.createElement("article");
    card.className = "privacy-category-card";
    card.dataset.category = key;

    const cardHeader = document.createElement("div");
    cardHeader.className = "privacy-category-header";

    const catHeading = document.createElement("h3");
    catHeading.textContent = category.title;

    const tagBadge = document.createElement("span");
    tagBadge.className = "category-tag";
    tagBadge.textContent = tag;

    cardHeader.append(catHeading, tagBadge);
    card.append(cardHeader);

    const list = document.createElement("ul");
    list.className = "privacy-category-list";
    for (const item of category.items) {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    }
    card.append(list);
    grid.append(card);
  }

  section.append(grid);
  return section;
}
