import { describe, expect, test } from "bun:test";

import {
  DB_COMMAND_NAMES,
  DB_COMMANDS,
  DB_WORKFLOW_DATABASES,
  MIGRATION_RULES,
  TEST_ISOLATION,
} from "../src/foundation/db-workflow";

describe("local postgres workflow", () => {
  test("separates the development database from the test database", () => {
    expect(DB_WORKFLOW_DATABASES.map((database) => database.name)).toEqual([
      "filika",
      "filika_test",
    ]);
    expect(DB_WORKFLOW_DATABASES[0]?.role).toBe("development");
    expect(DB_WORKFLOW_DATABASES[1]?.role).toBe("test");
  });

  test("defines exactly the four required commands", () => {
    expect(DB_COMMAND_NAMES).toEqual(["db:migrate", "db:seed", "db:cleanup", "db:reset"]);
    expect(DB_COMMANDS.map((command) => command.name)).toEqual(DB_COMMAND_NAMES);
  });

  test("gives every command a behavioral description", () => {
    for (const command of DB_COMMANDS) {
      expect(command.behavior.length).toBeGreaterThan(0);
    }
  });

  test("keeps migrations append-only and safe on an empty database", () => {
    expect(MIGRATION_RULES.join(" ")).toMatch(/append-only/i);
    expect(MIGRATION_RULES.join(" ")).toMatch(/never edited/i);
    expect(MIGRATION_RULES.join(" ")).toMatch(/empty database/i);
    expect(MIGRATION_RULES.join(" ")).toMatch(/no backup/i);
  });

  test("pins the isolated test database", () => {
    expect(TEST_ISOLATION.defaultTestDatabase).toBe("filika_test");
    expect(TEST_ISOLATION.neverMutatesDevelopmentDatabase).toBe(true);
  });
});
