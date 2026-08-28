import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { browserDatabaseCommand, browserDatabaseCwd } from "./database";

describe("browser database command", () => {
  test("uses the current Bun executable instead of relying on PATH lookup", () => {
    expect(browserDatabaseCommand("reset", "C:/tools/bun.exe")).toEqual([
      "C:/tools/bun.exe",
      "run",
      "db:reset",
    ]);
  });

  for (const name of ["candidate-check", "checkout with spaces"]) {
    test(`resolves the repository directory independently of its name: ${name}`, () => {
      const root = join(tmpdir(), name);
      const moduleUrl = pathToFileURL(join(root, "tests", "e2e", "database.ts"));

      expect(browserDatabaseCwd(moduleUrl.href)).toBe(`${root}${sep}`);
    });
  }
});
