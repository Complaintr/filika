import { describe, expect, test } from "bun:test";
import { browserDatabaseCommand, browserDatabaseCwd } from "./database";

describe("browser database command", () => {
  test("uses the current Bun executable instead of relying on PATH lookup", () => {
    expect(browserDatabaseCommand("reset", "C:/tools/bun.exe")).toEqual([
      "C:/tools/bun.exe",
      "run",
      "db:reset",
    ]);
  });

  test("converts the repository URL to a platform-native working directory", () => {
    const cwd = browserDatabaseCwd(import.meta.url);

    expect(cwd).not.toMatch(/^\/[A-Za-z]:\//);
    expect(cwd).toMatch(/[\\/]filika[\\/]?$/);
  });
});
