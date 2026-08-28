/** Never fall back to the developer's demo database for browser tests. */
export function browserDatabaseUrl(): string {
  const value = process.env.E2E_DATABASE_URL;
  if (!value) throw new Error("Set E2E_DATABASE_URL to a dedicated local filika_e2e database.");
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/filika_e2e" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Browser tests require a local database named filika_e2e without URL parameters.",
    );
  }
  return value;
}

export function browserDatabaseCommand(action: string, executable = process.execPath): string[] {
  return [executable, "run", `db:${action}`];
}

if (import.meta.main) {
  const action = Bun.argv[2];
  if (!action || !["migrate", "seed", "cleanup", "reset"].includes(action)) {
    throw new Error("Expected migrate, seed, cleanup, or reset.");
  }
  const child = Bun.spawn(browserDatabaseCommand(action), {
    cwd: new URL("../..", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: browserDatabaseUrl() },
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exitCode = await child.exited;
}
