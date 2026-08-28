import { createDb } from "./db/client";
import { createFetchHandler } from "./handler";

export const COLLECTOR_DEFAULT_PORT = 8787 as const;

export interface CollectorServerOptions {
  databaseUrl: string;
  port?: number;
}

export function startCollectorServer(
  options: CollectorServerOptions,
): ReturnType<typeof Bun.serve> {
  const handle = createDb(options.databaseUrl);

  return Bun.serve({
    fetch: createFetchHandler(handle.db),
    port: options.port ?? COLLECTOR_DEFAULT_PORT,
  });
}

if (import.meta.main) {
  startCollectorServer({
    databaseUrl: process.env.DATABASE_URL ?? "postgres://localhost:5432/filika",
  });
}