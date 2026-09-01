import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const PROJECT_TABLE_NAME = "project";
export const FEEDBACK_TABLE_NAME = "feedback";
export const RATE_LIMIT_TABLE_NAME = "rate_limit";
export const USER_TABLE_NAME = "user";
export const SESSION_TABLE_NAME = "session";
export const ACCOUNT_TABLE_NAME = "account";
export const VERIFICATION_TABLE_NAME = "verification";

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
  ownerUserId: text("owner_user_id").references(() => user.id),
  slug: text("slug").unique(),
  dashboardDays: integer("dashboard_days").notNull().default(30),
  allowedOrigins: text("allowed_origins").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  displayName: text("display_name").notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  integrationVerifiedAt: timestamp("integration_verified_at", { withTimezone: true }),
  projectKey: text("project_key").notNull().unique(),
  rateLimitMax: integer("rate_limit_max").notNull().default(100),
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

export const user = pgTable(USER_TABLE_NAME, {
  googleImage: text("google_image"),
  useGoogleImage: boolean("use_google_image").notNull().default(false),
  theme: text("theme").notNull().default("light"),
  density: text("density").notNull().default("comfortable"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  id: text("id").primaryKey(),
  image: text("image"),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(SESSION_TABLE_NAME, {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  id: text("id").primaryKey(),
  ipAddress: text("ip_address"),
  token: text("token").notNull().unique(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable(ACCOUNT_TABLE_NAME, {
  accessToken: text("access_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  accountId: text("account_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  id: text("id").primaryKey(),
  idToken: text("id_token"),
  issuer: text("issuer").notNull(),
  password: text("password"),
  providerId: text("provider_id").notNull(),
  refreshToken: text("refresh_token"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const verification = pgTable(VERIFICATION_TABLE_NAME, {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  value: text("value").notNull(),
});

export type Project = typeof project.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type RateLimit = typeof rateLimit.$inferSelect;

// Integration credentials are separate from login-provider credentials.
export const githubAuthorization = pgTable("github_authorization", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => project.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  githubUserId: text("github_user_id").notNull(),
  encryptedToken: text("encrypted_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const githubOauthState = pgTable("github_oauth_state", {
  stateHash: text("state_hash").primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => project.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const githubConnection = pgTable("github_connection", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => project.id, { onDelete: "cascade" }),
  version: uuid("version").notNull().defaultRandom(),
  installationId: text("installation_id").notNull(),
  repositoryId: text("repository_id").notNull(),
  fullName: text("full_name").notNull(),
  isPrivate: boolean("is_private").notNull(),
  active: boolean("active").notNull().default(true),
  issueMode: text("issue_mode", { enum: ["manual", "automatic"] })
    .notNull()
    .default("manual"),
  automaticApprovedBy: text("automatic_approved_by").references(() => user.id, {
    onDelete: "set null",
  }),
});

export const githubIssue = pgTable("github_issue", {
  feedbackId: uuid("feedback_id")
    .primaryKey()
    .references(() => feedback.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  operationId: uuid("operation_id").notNull().defaultRandom(),
  approvedBy: text("approved_by")
    .notNull()
    .references(() => user.id),
  installationId: text("installation_id").notNull(),
  repositoryId: text("repository_id").notNull(),
  fullName: text("full_name").notNull(),
  trigger: text("trigger", { enum: ["manual", "automatic"] })
    .notNull()
    .default("manual"),
  status: text("status", { enum: ["pending", "created", "uncertain", "failed"] }).notNull(),
  issueNumber: integer("issue_number"),
  issueUrl: text("issue_url"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
});
