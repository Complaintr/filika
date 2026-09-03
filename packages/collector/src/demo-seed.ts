import { and, count, eq } from "drizzle-orm";
import type { Db } from "./db/client";
import { feedback, type Project } from "./db/schema";
import type { FeedbackKind } from "./envelope";

/**
 * Sample feedback is marked with this source so it can be listed, counted, and
 * removed again without touching real reports.
 */
export const DEMO_SOURCE = "demo_seed" as const;
export const DEMO_SEED_BATCH = 300 as const;
export const DEMO_SEED_DAYS = 90 as const;
export const DEMO_SEED_SDK_VERSION = "1.0.0" as const;
export const DEMO_SEED_APPLICATION_RELEASE = "demo-seed" as const;

const KINDS: readonly FeedbackKind[] = ["bug", "blocked_task", "confusing_behavior", "idea"];

const ROUTE_LABELS = [
  "/",
  "/products",
  "/cart",
  "/checkout",
  "/search",
  "/account/settings",
  "/orders",
  "/support",
] as const;

interface SampleContent {
  descriptions: readonly string[];
  expected: string;
  steps: readonly (readonly string[])[];
  titles: readonly string[];
}

const SAMPLES: Record<FeedbackKind, SampleContent> = {
  bug: {
    titles: [
      "Save button is unresponsive",
      "Checkout spinner never finishes",
      "Image gallery does not open",
      "Filters reset when navigating back",
      "Email field rejects valid addresses",
      "Order confirmation is not delivered",
      "Search results ignore the query",
      "Cart total updates incorrectly",
    ],
    descriptions: [
      "Clicked save on the settings page and nothing happened. The button flashes but the page never reloads and no confirmation appears.",
      "The checkout page shows a loading spinner that never finishes. The order never completes and the cart stays full.",
      "Opening the product gallery does nothing. The first image renders but the thumbnails cannot be clicked.",
      "Applied a filter, navigated to a product, and came back. All filters were cleared and the list started from the first page.",
      "Typed a valid address and the form flagged it as invalid. Other addresses work, so the validation rule seems wrong.",
      "The order confirmation email never arrived even though the order completed and the summary shows on screen.",
      "Searching for an exact product name returns unrelated results. The query appears to be ignored entirely.",
      "Adding two different items to the cart shows a total that does not match the sum of the items.",
    ],
    expected:
      "The action should complete and the page should show the expected result without errors.",
    steps: [
      ["Open the page", "Repeat the action twice"],
      ["Load the page", "Wait for content", "Trigger the action"],
      ["Navigate to the section", "Perform the action", "Observe the result"],
      ["Log in", "Open the affected page", "Repeat the action"],
    ],
  },
  blocked_task: {
    titles: [
      "Cannot create a new project",
      "Sign in with Google gets stuck",
      "Export never completes",
      "Checkout requires a missing field",
      "Invite link expired before use",
      "Cannot upload a profile photo",
      "Payment method cannot be removed",
      "Report export times out",
    ],
    descriptions: [
      "Tried to create a project and the form never submits. The button stays disabled and no error message explains why.",
      "Started sign in with Google and the page froze on a blank screen. Returning to the app shows a half-open session.",
      "Started an export of reports and the progress bar stopped around the same point every time. The file is never ready.",
      "The checkout form asks for a field that does not exist anywhere on the page, so the order cannot be placed.",
      "Generated an invite link and shared it, but by the time the colleague opened it the link had already expired.",
      "Tried to upload a profile photo and the file picker closed without uploading. The photo never appears.",
      "Went to remove an old payment method and the remove option is missing. The method stays on the account.",
      "Exporting a large report set times out after a minute and no partial file is offered.",
    ],
    expected: "The task should finish successfully or explain clearly what is missing.",
    steps: [
      ["Attempt the task", "Wait for a result"],
      ["Open the page", "Start the task", "Wait for completion"],
      ["Fill the form", "Submit", "Wait for confirmation"],
    ],
  },
  confusing_behavior: {
    titles: [
      "Navigation label does not match the destination",
      "Pricing changes after switching plans",
      "Delete confirmation appears twice",
      "Currency switches without notice",
      "Dark mode toggle does nothing visible",
      "Notification settings are duplicated",
      "Breadcrumb goes to the wrong section",
      "Search sorts results unpredictably",
    ],
    descriptions: [
      "The menu item called Settings opens the billing page. The label and the destination do not match.",
      "The price shown on the plan page changes after selecting a plan. The displayed total is not stable.",
      "Deleting an item asks for confirmation twice. The second prompt appears right after the first one.",
      "The store shows prices in one currency and then switches to another after reloading the page.",
      "Toggling dark mode changes nothing on the current screen. The setting appears saved but has no effect.",
      "Notification preferences appear twice in different sections with different values. It is not clear which one applies.",
      "The breadcrumb on a product page links to a category that does not contain the product.",
      "Search results change order between searches for the same query, so it is hard to compare results.",
    ],
    expected: "The interface should behave consistently and the labels should match their actions.",
    steps: [
      ["Open the page", "Read the label", "Follow the link"],
      ["Change the setting", "Reload the page", "Compare the result"],
    ],
  },
  idea: {
    titles: [
      "Allow reports to be duplicated",
      "Add keyboard shortcuts",
      "Show recent searches",
      "Batch export reports",
      "Add a team activity feed",
      "Dark mode for the inbox",
      "Summarize feedback by week",
      "Allow custom feedback labels",
    ],
    descriptions: [
      "It would help to copy a report to a different category instead of retyping all the details by hand.",
      "Keyboard shortcuts for navigation and review would speed up working through a long inbox.",
      "Remembering recent searches would make repeated filtering much faster.",
      "Exporting the whole inbox at once would be more useful than exporting one page at a time.",
      "A feed of what the team reviewed would reduce duplicate work and keep everyone aligned.",
      "A dark mode for the inbox would be easier on the eyes during long review sessions.",
      "A weekly summary of feedback volume would help spot trends without opening the dashboard.",
      "Custom labels would let teams organize feedback the way their own workflow expects.",
    ],
    expected: "The suggestion should make the review workflow faster or easier to understand.",
    steps: [],
  },
};

function pick<T>(values: readonly T[]): T {
  const value = values[Math.floor(Math.random() * values.length)];
  if (value === undefined) throw new Error("Empty sample pool.");
  return value;
}

function stepsFor(sample: SampleContent): string[] {
  const pool = sample.steps;
  if (pool.length === 0) return [];
  const steps = pick(pool);
  return steps.length <= 1
    ? [...steps]
    : [...steps].slice(0, 1 + Math.floor(Math.random() * steps.length));
}

function timestampFor(now: Date): Date {
  const recent = Math.random() < 0.7;
  const spanDays = recent ? 14 : DEMO_SEED_DAYS;
  const offset = Math.random() * spanDays * 86_400_000;
  return new Date(now.getTime() - offset);
}

interface DemoFeedbackInsert {
  applicationRelease: string;
  description: string;
  eventId: string;
  expectedBehavior: string;
  kind: FeedbackKind;
  origin: string;
  projectId: string;
  receiptTimestamp: Date;
  reproductionSteps: string[] | null;
  routeLabel: string;
  sdkVersion: string;
  source: typeof DEMO_SOURCE;
  title: string;
}

function buildDemoRow(projectRow: Project, now: Date): DemoFeedbackInsert {
  const kind = pick(KINDS);
  const sample = SAMPLES[kind];
  if (sample === undefined) throw new Error("Unknown feedback kind.");
  const steps = stepsFor(sample);
  return {
    applicationRelease: DEMO_SEED_APPLICATION_RELEASE,
    description: pick(sample.descriptions),
    eventId: crypto.randomUUID(),
    expectedBehavior: sample.expected,
    kind,
    origin: projectRow.allowedOrigins[0] ?? "http://localhost:4173",
    projectId: projectRow.id,
    receiptTimestamp: timestampFor(now),
    reproductionSteps: steps.length > 0 ? steps : null,
    routeLabel: pick(ROUTE_LABELS),
    sdkVersion: DEMO_SEED_SDK_VERSION,
    source: DEMO_SOURCE,
    title: pick(sample.titles),
  };
}

export interface SeedResult {
  count: number;
  created: number;
}

export async function countDemoFeedback(db: Db, projectId: string): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(feedback)
    .where(and(eq(feedback.projectId, projectId), eq(feedback.source, DEMO_SOURCE)))
    .limit(1);
  return Number(rows[0]?.count ?? 0);
}

/**
 * Seeds one bounded batch of sample feedback for a project. When sample data
 * already exists the call is a no-op so repeated clicks stay bounded.
 */
export async function seedDemoFeedback(
  db: Db,
  projectRow: Project,
  now: Date = new Date(),
): Promise<SeedResult> {
  const existing = await countDemoFeedback(db, projectRow.id);
  if (existing > 0) return { created: 0, count: existing };
  const rows = Array.from({ length: DEMO_SEED_BATCH }, () => buildDemoRow(projectRow, now));
  await db.insert(feedback).values(rows);
  return { created: DEMO_SEED_BATCH, count: DEMO_SEED_BATCH };
}

export async function removeDemoFeedback(db: Db, projectId: string): Promise<number> {
  const rows = await db
    .delete(feedback)
    .where(and(eq(feedback.projectId, projectId), eq(feedback.source, DEMO_SOURCE)))
    .returning({ id: feedback.id });
  return rows.length;
}
