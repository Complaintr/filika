import { handleApplicationRoute } from "./application-routes";
import type { BetterAuth } from "./auth/better-auth";
import { allowOriginHeaders, buildPreflightResponse } from "./cors";
import { getDashboard } from "./dashboard";
import type { Db } from "./db/client";
import { FEEDBACK_ENDPOINT, INBOX_DETAIL_ENDPOINT, INBOX_LIST_ENDPOINT } from "./endpoint-contract";
import { GitHubClient } from "./github/client";
import type { GitHubConfig } from "./github/config";
import { prepareAutomaticGitHubIssue, sendReservedGitHubIssue } from "./github/issue-export";
import { GitHubRoutes, isGitHubRoute } from "./github/routes";
import { getInboxFeedback, listInbox } from "./inbox";
import { parseListQuery } from "./inbox-query";
import { ingestFeedback } from "./ingest";
import { collectAllowedOrigins } from "./project";

export interface CollectorRouteOptions {
  betterAuth?: BetterAuth | undefined;
  github?: GitHubConfig | undefined;
  runInBackground?(task: () => Promise<void>): void;
}

function unauthenticatedResponse(): Response {
  return Response.json({ error: { category: "unauthenticated" } }, { status: 401 });
}

export function createFetchHandler(
  db: Db,
  options?: CollectorRouteOptions,
): (request: Request) => Promise<Response> {
  const github = new GitHubRoutes(db, options?.github);
  const automaticClient = options?.github ? new GitHubClient(options.github) : null;
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (isGitHubRoute(url.pathname)) {
      const session =
        url.pathname === "/api/v1/github/webhook"
          ? null
          : await options?.betterAuth?.api.getSession({ headers: request.headers });
      return github.handle(request, session?.user.id ?? null);
    }

    if (
      url.pathname === "/api/v1/account" ||
      url.pathname === "/api/v1/apps" ||
      url.pathname.startsWith("/api/v1/apps/")
    ) {
      const session = await options?.betterAuth?.api.getSession({ headers: request.headers });
      if (!session) return unauthenticatedResponse();
      try {
        return await handleApplicationRoute(db, request, session.user.id);
      } catch {
        return Response.json({ error: { category: "internal_error" } }, { status: 500 });
      }
    }

    // Authenticated reads must name an owned application; never expose the old global inbox.
    if (
      options?.betterAuth &&
      request.method === "GET" &&
      (url.pathname === "/api/v1/dashboard" ||
        url.pathname === INBOX_LIST_ENDPOINT ||
        url.pathname.startsWith(INBOX_DETAIL_ENDPOINT))
    ) {
      if (!(await requireSession(request, options))) return unauthenticatedResponse();
      return Response.json({ error: { category: "application_required" } }, { status: 400 });
    }

    if (request.method === "GET" && url.pathname === "/api/v1/dashboard") {
      if (!(await requireSession(request, options))) {
        return unauthenticatedResponse();
      }
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
      return ingestFeedback(db, request, undefined, {
        async onCreated(app, feedback) {
          if (!automaticClient) return;
          const prepared = await prepareAutomaticGitHubIssue(db, app, feedback);
          if (!prepared) return;
          const task = async () => {
            await sendReservedGitHubIssue(db, automaticClient, prepared.row, prepared.draft);
          };
          if (options?.runInBackground) options.runInBackground(task);
          else void task().catch(() => {});
        },
      });
    }

    if (request.method === "GET" && url.pathname === INBOX_LIST_ENDPOINT) {
      if (!(await requireSession(request, options))) {
        return unauthenticatedResponse();
      }
      const allowedOrigins = await collectAllowedOrigins(db);
      const headers = allowOriginHeaders(request, allowedOrigins);
      const result = await listInbox(db, parseListQuery(url));

      return Response.json(result, { headers });
    }

    if (request.method === "GET" && url.pathname.startsWith(INBOX_DETAIL_ENDPOINT)) {
      if (!(await requireSession(request, options))) {
        return unauthenticatedResponse();
      }
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

async function requireSession(
  request: Request,
  options: CollectorRouteOptions | undefined,
): Promise<boolean> {
  if (options?.betterAuth === undefined) {
    return true;
  }

  const session = await options.betterAuth.api.getSession({ headers: request.headers });
  return session !== null;
}
