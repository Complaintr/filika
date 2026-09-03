export type LandingDemoFeedbackKind = "bug" | "blocked_task" | "confusing_behavior" | "idea";

export interface LandingDemoCategory {
  readonly count: number;
  readonly filterLabel: string;
  readonly kind: LandingDemoFeedbackKind;
  readonly label: string;
  readonly percentage: number;
}

export interface LandingDemoReport {
  readonly description: string;
  readonly expectedBehavior: string;
  readonly kind: LandingDemoFeedbackKind;
  readonly origin: string;
  readonly received: string;
  readonly receivedLabel: string;
  readonly relativeTime: string;
  readonly route: string;
  readonly title: string;
}

export const LANDING_DEMO_CATEGORIES = [
  {
    count: 15,
    filterLabel: "Bugs",
    kind: "bug",
    label: "Bug report",
    percentage: 25,
  },
  {
    count: 15,
    filterLabel: "Blocked tasks",
    kind: "blocked_task",
    label: "Blocked task",
    percentage: 25,
  },
  {
    count: 15,
    filterLabel: "Confusing",
    kind: "confusing_behavior",
    label: "Confusing behavior",
    percentage: 25,
  },
  {
    count: 15,
    filterLabel: "Ideas",
    kind: "idea",
    label: "Idea",
    percentage: 25,
  },
] as const satisfies readonly LandingDemoCategory[];

export const LANDING_DEMO_REPORTS = [
  {
    description:
      "After filtering the dashboard table, selecting Export no longer starts a download or shows a response.",
    expectedBehavior: "Export should download the currently filtered complaint list.",
    kind: "bug",
    origin: "http://localhost:4173",
    received: "Sep 2, 2026 at 10:18",
    receivedLabel: "Sep 2, 2026",
    relativeTime: "2 min ago",
    route: "/dashboard",
    title: "Export button stops responding after filtering",
  },
  {
    description:
      "A navigation item describes a different destination from the page that opens after it is selected.",
    expectedBehavior: "Navigation labels should describe the page that each item opens.",
    kind: "confusing_behavior",
    origin: "http://localhost:4173",
    received: "Sep 2, 2026 at 09:46",
    receivedLabel: "Sep 2, 2026",
    relativeTime: "34 min ago",
    route: "/dashboard",
    title: "Navigation label does not match the destination",
  },
  {
    description:
      "Teams sometimes need to copy an existing report before adapting it for a related workflow.",
    expectedBehavior: "Add an explicit duplicate action that creates a new editable report.",
    kind: "idea",
    origin: "http://localhost:4173",
    received: "Sep 1, 2026 at 16:20",
    receivedLabel: "Sep 1, 2026",
    relativeTime: "1 day ago",
    route: "/settings",
    title: "Allow reports to be duplicated",
  },
  {
    description:
      "The final account setup step stays incomplete after all required workspace details are provided.",
    expectedBehavior:
      "Submitting valid setup details should complete onboarding and open the dashboard.",
    kind: "blocked_task",
    origin: "http://localhost:4173",
    received: "Sep 1, 2026 at 14:05",
    receivedLabel: "Sep 1, 2026",
    relativeTime: "1 day ago",
    route: "/settings",
    title: "Unable to finish the account setup flow",
  },
] as const satisfies readonly LandingDemoReport[];

export function landingDemoCategory(kind: LandingDemoFeedbackKind): LandingDemoCategory {
  const category = LANDING_DEMO_CATEGORIES.find((item) => item.kind === kind);
  if (!category) throw new Error("Unknown landing demo feedback category.");
  return category;
}
