import { allowOriginHeaders, buildPreflightResponse } from "./cors";
import { createDb, type Db } from "./db/client";
import { getDashboard } from "./dashboard";
import { FEEDBACK_ENDPOINT, INBOX_DETAIL_ENDPOINT, INBOX_LIST_ENDPOINT } from "./endpoint-contract";
import { getInboxFeedback, listInbox } from "./inbox";
import { INBOX_PAGE_SIZE_DEFAULT, type InboxListQuery } from "./inbox-contract";
import { ingestFeedback } from "./ingest";
import { collectAllowedOrigins } from "./project";

export const COLLECTOR_DEFAULT_PORT = 8787 as const;

export interface CollectorServerOptions {
  databaseUrl: string;
  port?: number;
}

function parseListQuery(url: URL): InboxListQuery {
  const rawLimit = url.searchParams.get("limit");
  const parsedLimit = rawLimit === null ? Number.NaN : Number.parseInt(rawLimit, 10);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : INBOX_PAGE_SIZE_DEFAULT;

  return {
    cursor: url.searchParams.get("cursor"),
    limit,
    search: (url.searchParams.get("search") ?? "").trim().slice(0, 200),
    ...parseKind(url.searchParams.get("kind")),
  };
}

function parseKind(kind: string | null): Pick<InboxListQuery, "kind"> {
  return kind === "bug" ||
    kind === "blocked_task" ||
    kind === "confusing_behavior" ||
    kind === "idea"
    ? { kind }
    : {};
}

export function createFetchHandler(db: Db): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/v1/dashboard") {
      const rawDays = url.searchParams.get("days");
      const days = rawDays === "7" ? 7 : rawDays === "90" ? 90 : 30;
      const headers = allowOriginHeaders(request, await collectAllowedOrigins(db));
      return Response.json(await getDashboard(db, days), { headers });
    }

    if (request.method === "OPTIONS" && url.pathname === FEEDBACK_ENDPOINT) {
      const allowedOrigins = await collectAllowedOrigins(db);

      return buildPreflightResponse(request, allowedOrigins);
    }

    if (request.method === "POST" && url.pathname === FEEDBACK_ENDPOINT) {
      return ingestFeedback(db, request);
    }

    if (request.method === "GET" && url.pathname === INBOX_LIST_ENDPOINT) {
      const allowedOrigins = await collectAllowedOrigins(db);
      const headers = allowOriginHeaders(request, allowedOrigins);
      const result = await listInbox(db, parseListQuery(url));

      return Response.json(result, { headers });
    }

    if (request.method === "GET" && url.pathname.startsWith(INBOX_DETAIL_ENDPOINT)) {
      const allowedOrigins = await collectAllowedOrigins(db);
      const headers = allowOriginHeaders(request, allowedOrigins);
      const feedbackId = url.pathname.slice(INBOX_DETAIL_ENDPOINT.length);
      const record = await getInboxFeedback(db, feedbackId);

      if (record === null) {
        return new Response(null, { headers, status: 404 });
      }

      return Response.json({ feedback: record }, { headers });
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
