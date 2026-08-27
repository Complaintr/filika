export const DB_WORKFLOW_DATABASES = [
  {
    name: "filika",
    purpose: "Local development data for the demo and inbox.",
    role: "development",
  },
  {
    name: "filika_test",
    purpose: "Isolated test database; tests only.",
    role: "test",
  },
] as const;

export type DbWorkflowDatabase = (typeof DB_WORKFLOW_DATABASES)[number];

export const DB_COMMAND_NAMES = ["db:migrate", "db:seed", "db:cleanup", "db:reset"] as const;

export type DbCommandName = (typeof DB_COMMAND_NAMES)[number];

export interface DbCommand {
  behavior: string;
  name: DbCommandName;
}

export const DB_COMMANDS: readonly DbCommand[] = [
  {
    behavior: "Apply pending migrations to the configured database.",
    name: "db:migrate",
  },
  {
    behavior:
      "Seed the challenge demo project, its allowed localhost origins, and the retention window.",
    name: "db:seed",
  },
  {
    behavior: "Remove expired feedback and expired rate-limit identifiers in one pass.",
    name: "db:cleanup",
  },
  {
    behavior:
      "Drop and recreate the schema, then migrate and seed, for deterministic repeated runs.",
    name: "db:reset",
  },
];

export const MIGRATION_RULES = [
  "Migrations are versioned, ordered, and append-only.",
  "An applied migration is never edited; corrections are new migrations.",
  "Migrations apply cleanly to an empty database and produce the expected constraints.",
  "db:reset is the documented deterministic reset path; there is no backup workflow.",
] as const;

export const TEST_ISOLATION = {
  defaultTestDatabase: "filika_test",
  neverMutatesDevelopmentDatabase: true,
} as const;
