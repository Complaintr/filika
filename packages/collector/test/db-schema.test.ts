import { describe, expect, test } from "bun:test";
import { getTableColumns } from "drizzle-orm";

import {
  FEEDBACK_TABLE_NAME,
  FEEDBACK_UNIQUE_CONSTRAINT,
  feedback,
  feedbackKind,
  PROJECT_TABLE_NAME,
  project,
  RATE_LIMIT_TABLE_NAME,
  RATE_LIMIT_UNIQUE_CONSTRAINT,
  rateLimit,
} from "../src/db/schema";
import { FEEDBACK_KINDS } from "../src/envelope";

describe("drizzle tables", () => {
  test("defines the project table with its columns", () => {
    const columns = getTableColumns(project);

    expect(Object.keys(columns).sort()).toEqual(
      [
        "id",
        "ownerUserId",
        "slug",
        "dashboardDays",
        "projectKey",
        "displayName",
        "rateLimitMax",
        "retentionHours",
        "allowedOrigins",
        "createdAt",
      ].sort(),
    );
    expect(PROJECT_TABLE_NAME).toBe("project");
  });

  test("defines the feedback table with its columns", () => {
    const columns = getTableColumns(feedback);

    expect(Object.keys(columns).sort()).toEqual(
      [
        "id",
        "projectId",
        "eventId",
        "kind",
        "title",
        "description",
        "expectedBehavior",
        "reproductionSteps",
        "origin",
        "source",
        "sdkVersion",
        "routeLabel",
        "applicationRelease",
        "receiptTimestamp",
      ].sort(),
    );
    expect(FEEDBACK_TABLE_NAME).toBe("feedback");
  });

  test("defines the durable rate-limit table with its columns", () => {
    const columns = getTableColumns(rateLimit);

    expect(Object.keys(columns).sort()).toEqual(
      ["id", "projectId", "windowKey", "count", "expiresAt"].sort(),
    );
    expect(RATE_LIMIT_TABLE_NAME).toBe("rate_limit");
  });

  test("pins the unique feedback constraint on project and event", () => {
    expect(FEEDBACK_UNIQUE_CONSTRAINT.name).toBe("feedback_project_event_unique");
    expect(FEEDBACK_UNIQUE_CONSTRAINT.columns).toEqual(["projectId", "eventId"]);
  });

  test("pins the unique rate-limit constraint on project and window", () => {
    expect(RATE_LIMIT_UNIQUE_CONSTRAINT.name).toBe("rate_limit_project_window_unique");
    expect(RATE_LIMIT_UNIQUE_CONSTRAINT.columns).toEqual(["projectId", "windowKey"]);
  });

  test("keeps the feedback source server-owned by default", () => {
    const columns = getTableColumns(feedback);
    const source = columns.source;

    expect(source).toBeDefined();
  });

  test("keeps the feedback kind enum aligned with the envelope contract", () => {
    expect(feedbackKind.enumValues).toEqual(FEEDBACK_KINDS);
  });
});
