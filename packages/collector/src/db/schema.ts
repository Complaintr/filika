import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const PROJECT_TABLE_NAME = "project";
export const FEEDBACK_TABLE_NAME = "feedback";
export const RATE_LIMIT_TABLE_NAME = "rate_limit";

export const FEEDBACK_UNIQUE_CONSTRAINT = {
  columns: ["projectId", "eventId"],
  name: "feedback_project_event_unique",
} as const;

export const RATE_LIMIT_UNIQUE_CONSTRAINT = {
  columns: ["projectId", "windowKey"],
  name: "rate_limit_project_window_unique",
} as const;

export const feedbackKind = pgEnum("feedback_kind", [
  "bug",
  "blocked_task",
  "confusing_behavior",
  "idea",
]);

export const project = pgTable(PROJECT_TABLE_NAME, {
  allowedOrigins: text("allowed_origins").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  displayName: text("display_name").notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  projectKey: text("project_key").notNull().unique(),
  retentionHours: integer("retention_hours").notNull().default(24),
});

export const feedback = pgTable(
  FEEDBACK_TABLE_NAME,
  {
    applicationRelease: text("application_release"),
    description: text("description").notNull(),
    eventId: uuid("event_id").notNull(),
    expectedBehavior: text("expected_behavior"),
    id: uuid("id").defaultRandom().primaryKey(),
    kind: feedbackKind("kind").notNull(),
    origin: text("origin").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id),
    receiptTimestamp: timestamp("receipt_timestamp", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    reproductionSteps: text("reproduction_steps").array(),
    routeLabel: text("route_label"),
    sdkVersion: text("sdk_version").notNull(),
    source: text("source").notNull().default("web_sdk_unverified"),
    title: text("title").notNull(),
  },
  (table) => [uniqueIndex(FEEDBACK_UNIQUE_CONSTRAINT.name).on(table.projectId, table.eventId)],
);

export const rateLimit = pgTable(
  RATE_LIMIT_TABLE_NAME,
  {
    count: integer("count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id),
    windowKey: text("window_key").notNull(),
  },
  (table) => [uniqueIndex(RATE_LIMIT_UNIQUE_CONSTRAINT.name).on(table.projectId, table.windowKey)],
);

export type Project = typeof project.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type RateLimit = typeof rateLimit.$inferSelect;
