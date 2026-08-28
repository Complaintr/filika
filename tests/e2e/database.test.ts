import { describe, expect, test } from "bun:test";
import { browserDatabaseCommand } from "./database";

describe("browser database command", () => {
  test("uses the current Bun executable instead of relying on PATH lookup", () => {
    expect(browserDatabaseCommand("reset", "C:/tools/bun.exe")).toEqual([
      "C:/tools/bun.exe",
      "run",
      "db:reset",
    ]);
  });
});
