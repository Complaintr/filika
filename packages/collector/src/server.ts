import { buildPreflightResponse } from "./cors";
import { createDb, type Db } from "./db/client";
import { project } from "./db/schema";
import { FEEDBACK_ENDPOINT } from "./endpoint-contract";
import { ingestFeedback } from "./ingest";

export const COLLECTOR_DEFAULT_PORT = 8787 as const;

export interface CollectorServerOptions {
  databaseUrl: string;
  port?: number;
}

export async function collectAllowedOrigins(db: Db): Promise<string[]> {
  const rows = await db.select({ allowedOrigins: project.allowedOrigins }).from(project);

  return [...new Set(rows.flatMap((row) => row.allowedOrigins))];
}

export function createFetchHandler(db: Db): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname === FEEDBACK_ENDPOINT) {
      const allowedOrigins = await collectAllowedOrigins(db);

      return buildPreflightResponse(request, allowedOrigins);
    }

    if (request.method === "POST" && url.pathname === FEEDBACK_ENDPOINT) {
      return ingestFeedback(db, request);
    }

    return new Response("Not found.", { status: 404 });
  };
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
