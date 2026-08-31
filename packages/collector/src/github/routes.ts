import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { ownedApplication } from "../applications";
import { hasFeedbackExpired } from "../cleanup";
import type { Db } from "../db/client";
import {
  feedback,
  githubAuthorization,
  githubConnection,
  githubIssue,
  githubOauthState,
  type Project,
  project,
  rateLimit,
} from "../db/schema";
import { boundedText, GitHubClient, GitHubError } from "./client";
import {
  decryptToken,
  encryptToken,
  type GitHubConfig,
  hashState,
  newState,
  validWebhook,
} from "./config";
import { githubId, issueApproval, issueDraft, issueMarker, repositorySelection } from "./contracts";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (category: string, status: number): never => {
  throw new GitHubError(category, status, true);
};
const empty = z.object({}).strict();
const pageQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100).default(1),
    installationId: githubId.optional(),
  })
  .strict();
type Connection = typeof githubConnection.$inferSelect;
type Issue = typeof githubIssue.$inferSelect;

function connectionView(row: Connection) {
  return {
    version: row.version,
    installationId: row.installationId,
    repositoryId: row.repositoryId,
    fullName: row.fullName,
    isPrivate: row.isPrivate,
    active: row.active,
  };
}
function issueView(row: Issue) {
  return {
    status:
      row.status === "pending" && Date.now() - row.startedAt.getTime() > 60_000
        ? "uncertain"
        : row.status,
    number: row.issueNumber,
    url: row.issueUrl,
    fullName: row.fullName,
  };
}

export class GitHubRoutes {
  private client: GitHubClient | undefined;
  constructor(
    private db: Db,
    private config?: GitHubConfig,
    client?: GitHubClient,
  ) {
    this.client = client ?? (config ? new GitHubClient(config) : undefined);
  }

  private configured(): { config: GitHubConfig; client: GitHubClient } {
    if (!this.config || !this.client) return fail("github_not_configured", 503);
    return { config: this.config, client: this.client };
  }

  private async userToken(app: Project, userId: string): Promise<string> {
    const { config } = this.configured();
    const [auth] = await this.db
      .select()
      .from(githubAuthorization)
      .where(
        and(
          eq(githubAuthorization.projectId, app.id),
          eq(githubAuthorization.userId, userId),
          gt(githubAuthorization.expiresAt, new Date()),
        ),
      );
    if (!auth) return fail("reauthorize", 409);
    return decryptToken(auth.encryptedToken, config.encryptionKey, `${app.id}:${userId}`);
  }

  private async connection(app: Project): Promise<Connection | null> {
    return (
      (
        await this.db.select().from(githubConnection).where(eq(githubConnection.projectId, app.id))
      )[0] ?? null
    );
  }

  private async rateLimit(app: Project) {
    const minute = Math.floor(Date.now() / 60_000);
    const rows = await this.db
      .insert(rateLimit)
      .values({
        projectId: app.id,
        windowKey: `github:${minute}`,
        count: 1,
        expiresAt: new Date((minute + 2) * 60_000),
      })
      .onConflictDoUpdate({
        target: [rateLimit.projectId, rateLimit.windowKey],
        set: { count: sql`${rateLimit.count} + 1` },
        setWhere: lt(rateLimit.count, 30),
      })
      .returning({ id: rateLimit.id });
    if (rows.length === 0) return fail("rate_limited", 429);
  }

  private async status(app: Project, userId: string) {
    let connection = await this.connection(app);
    const [auth] = await this.db
      .select({ expiresAt: githubAuthorization.expiresAt })
      .from(githubAuthorization)
      .where(
        and(eq(githubAuthorization.projectId, app.id), eq(githubAuthorization.userId, userId)),
      );
    const authorized = Boolean(this.config && auth && auth.expiresAt.getTime() > Date.now());
    if (connection?.active && authorized) {
      try {
        const repo = await this.configured().client.accessibleRepository(
          await this.userToken(app, userId),
          connection.repositoryId,
        );
        // Refresh the preview, but never silently redirect an already approved request.
        connection = { ...connection, fullName: repo.fullName, isPrivate: repo.isPrivate };
      } catch (error) {
        if (error instanceof GitHubError && error.category === "reauthorize")
          return {
            configured: Boolean(this.config),
            authorized: false,
            installUrl: this.installUrl(),
            connection: connectionView(connection),
          };
        connection = { ...connection, active: false };
      }
    }
    return {
      configured: Boolean(this.config),
      authorized,
      installUrl: this.installUrl(),
      connection: connection ? connectionView(connection) : null,
    };
  }

  private installUrl(): string | null {
    return this.config ? `https://github.com/apps/${this.config.appSlug}/installations/new` : null;
  }

  private async start(app: Project, userId: string) {
    const { config } = this.configured();
    const state = newState();
    await this.db
      .insert(githubOauthState)
      .values({
        stateHash: hashState(state),
        projectId: app.id,
        userId,
        expiresAt: new Date(Date.now() + 600_000),
      })
      .onConflictDoUpdate({
        target: githubOauthState.projectId,
        set: { stateHash: hashState(state), userId, expiresAt: new Date(Date.now() + 600_000) },
      });
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", `${config.baseUrl}/api/v1/github/callback`);
    url.searchParams.set("state", state);
    return json({ url: url.href });
  }

  private async callback(request: Request, userId: string) {
    const { config, client } = this.configured();
    const query = new URL(request.url).searchParams;
    const state = query.get("state");
    if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state)) return fail("invalid_oauth_state", 400);
    const [pending] = await this.db
      .select()
      .from(githubOauthState)
      .where(
        and(
          eq(githubOauthState.stateHash, hashState(state)),
          eq(githubOauthState.userId, userId),
          gt(githubOauthState.expiresAt, new Date()),
        ),
      );
    if (!pending) return fail("invalid_oauth_state", 400);
    const [app] = await this.db
      .select()
      .from(project)
      .where(and(eq(project.id, pending.projectId), eq(project.ownerUserId, userId)));
    if (!app?.slug) return fail("not_found", 404);
    const destination = new URL(`/${app.slug}/settings`, config.baseUrl);
    destination.searchParams.set("github", "error");
    try {
      const code = query.get("code");
      if (query.has("error") || !code || code.length > 512)
        throw new GitHubError("reauthorize", 409);
      await this.db.transaction(async (tx) => {
        // Serialize callback completion with disconnect so revoked credentials cannot reappear.
        await tx
          .select({ id: project.id })
          .from(project)
          .where(eq(project.id, app.id))
          .for("update");
        const [consumed] = await tx
          .delete(githubOauthState)
          .where(
            and(
              eq(githubOauthState.stateHash, hashState(state)),
              eq(githubOauthState.userId, userId),
              gt(githubOauthState.expiresAt, new Date()),
            ),
          )
          .returning();
        if (!consumed) return fail("invalid_oauth_state", 400);
        const result = await client.exchangeCode(code);
        const values = {
          projectId: app.id,
          userId,
          githubUserId: result.userId,
          encryptedToken: encryptToken(result.token, config.encryptionKey, `${app.id}:${userId}`),
          expiresAt: result.expiresAt,
        };
        await tx
          .insert(githubAuthorization)
          .values(values)
          .onConflictDoUpdate({ target: githubAuthorization.projectId, set: values });
      });
      destination.searchParams.set("github", "connected");
    } catch {
      await this.db
        .delete(githubOauthState)
        .where(
          and(
            eq(githubOauthState.stateHash, hashState(state)),
            eq(githubOauthState.userId, userId),
          ),
        );
      /* Do not send OAuth codes, tokens or provider errors to the browser. */
    }
    return new Response(null, {
      status: 303,
      headers: {
        Location: destination.href,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }

  private async bind(app: Project, userId: string, input: unknown) {
    const selection = repositorySelection.parse(input);
    const { client } = this.configured();
    await this.db.transaction(async (tx) => {
      await tx.select({ id: project.id }).from(project).where(eq(project.id, app.id)).for("update");
      const repo = await client.accessibleRepository(
        await this.userToken(app, userId),
        selection.repositoryId,
      );
      await client.installationToken(selection.installationId, selection.repositoryId);
      await tx
        .insert(githubConnection)
        .values({
          projectId: app.id,
          ...selection,
          fullName: repo.fullName,
          isPrivate: repo.isPrivate,
        })
        .onConflictDoUpdate({
          target: githubConnection.projectId,
          set: {
            ...selection,
            fullName: repo.fullName,
            isPrivate: repo.isPrivate,
            active: true,
            version: crypto.randomUUID(),
          },
        });
    });
    return json(await this.status(app, userId));
  }

  private async disconnect(app: Project) {
    await this.db.transaction(async (tx) => {
      await tx.select({ id: project.id }).from(project).where(eq(project.id, app.id)).for("update");
      await tx.delete(githubConnection).where(eq(githubConnection.projectId, app.id));
      await tx.delete(githubAuthorization).where(eq(githubAuthorization.projectId, app.id));
      await tx.delete(githubOauthState).where(eq(githubOauthState.projectId, app.id));
    });
    return json({ disconnected: true });
  }

  private async report(app: Project, feedbackId: string) {
    if (!z.uuid().safeParse(feedbackId).success) return fail("not_found", 404);
    const [report] = await this.db
      .select()
      .from(feedback)
      .where(and(eq(feedback.id, feedbackId), eq(feedback.projectId, app.id)));
    if (!report || hasFeedbackExpired(report.receiptTimestamp, new Date(), app.retentionHours))
      return fail("not_found", 404);
    return report;
  }

  private async create(app: Project, userId: string, feedbackId: string, input: unknown) {
    const approval = issueApproval.parse(input);
    await this.report(app, feedbackId);
    const existing = (
      await this.db.select().from(githubIssue).where(eq(githubIssue.feedbackId, feedbackId))
    )[0];
    if (existing && existing.status !== "failed") return json({ issue: issueView(existing) });
    const connection = await this.connection(app);
    if (!connection?.active || connection.version !== approval.connectionVersion)
      return fail("connection_changed", 409);
    const { client } = this.configured();
    const repo = await client.accessibleRepository(
      await this.userToken(app, userId),
      connection.repositoryId,
    );
    if (repo.fullName !== approval.fullName || repo.isPrivate !== approval.isPrivate)
      return fail("connection_changed", 409);
    const token = await client.installationToken(
      connection.installationId,
      connection.repositoryId,
    );
    const reserved = await this.db.transaction(async (tx) => {
      await tx.select({ id: project.id }).from(project).where(eq(project.id, app.id)).for("update");
      const [current] = await tx
        .select()
        .from(githubConnection)
        .where(eq(githubConnection.projectId, app.id));
      if (!current?.active || current.version !== approval.connectionVersion)
        return fail("connection_changed", 409);
      // Lock the report against retention cleanup until the durable reservation commits.
      const [report] = await tx
        .select()
        .from(feedback)
        .where(and(eq(feedback.id, feedbackId), eq(feedback.projectId, app.id)))
        .for("update");
      if (!report || hasFeedbackExpired(report.receiptTimestamp, new Date(), app.retentionHours))
        return fail("not_found", 404);
      const [previous] = await tx
        .select()
        .from(githubIssue)
        .where(eq(githubIssue.feedbackId, feedbackId));
      if (previous && previous.status !== "failed") return { row: previous, send: false };
      const values = {
        feedbackId,
        projectId: app.id,
        approvedBy: userId,
        installationId: current.installationId,
        repositoryId: current.repositoryId,
        fullName: repo.fullName,
        status: "pending" as const,
        startedAt: new Date(),
      };
      const [row] = previous
        ? await tx
            .update(githubIssue)
            .set(values)
            .where(eq(githubIssue.feedbackId, feedbackId))
            .returning()
        : await tx.insert(githubIssue).values(values).returning();
      if (!row) return fail("internal_error", 500);
      return { row, send: true };
    });
    if (!reserved.send) return json({ issue: issueView(reserved.row) });
    let result: { number: number; url: string };
    try {
      result = await client.createIssue(
        token,
        repo.fullName,
        approval.title,
        `${approval.body}\n\n${issueMarker(reserved.row.operationId)}`,
      );
    } catch (error) {
      const status = error instanceof GitHubError && error.definite ? "failed" : "uncertain";
      await this.db
        .update(githubIssue)
        .set({ status })
        .where(and(eq(githubIssue.feedbackId, feedbackId), eq(githubIssue.status, "pending")));
      return json({ issue: issueView({ ...reserved.row, status }) });
    }
    // A persistence failure leaves the reservation pending: never resend the POST.
    await this.db
      .update(githubIssue)
      .set({ status: "created", issueNumber: result.number, issueUrl: result.url })
      .where(eq(githubIssue.feedbackId, feedbackId));
    return json(
      {
        issue: issueView({
          ...reserved.row,
          status: "created",
          issueNumber: result.number,
          issueUrl: result.url,
        }),
      },
      201,
    );
  }

  private async reconcile(app: Project, userId: string, feedbackId: string) {
    await this.report(app, feedbackId);
    const [row] = await this.db
      .select()
      .from(githubIssue)
      .where(eq(githubIssue.feedbackId, feedbackId));
    if (!row) return fail("not_found", 404);
    if (
      row.status === "created" ||
      row.status === "failed" ||
      (row.status === "pending" && Date.now() - row.startedAt.getTime() < 60_000)
    )
      return json({ issue: issueView(row) });
    const { client } = this.configured();
    const repo = await client.accessibleRepository(
      await this.userToken(app, userId),
      row.repositoryId,
    );
    const token = await client.installationToken(row.installationId, row.repositoryId);
    const found = await client.findIssue(
      token,
      repo.fullName,
      issueMarker(row.operationId),
      new Date(row.startedAt.getTime() - 60_000),
    );
    if (found) {
      await this.db
        .update(githubIssue)
        .set({
          status: "created",
          issueNumber: found.number,
          issueUrl: found.url,
          fullName: repo.fullName,
        })
        .where(eq(githubIssue.feedbackId, feedbackId));
      return json({
        issue: issueView({
          ...row,
          status: "created",
          issueNumber: found.number,
          issueUrl: found.url,
          fullName: repo.fullName,
        }),
      });
    }
    return json({ issue: issueView({ ...row, status: "uncertain" }) });
  }

  private async webhook(request: Request) {
    const { config } = this.configured();
    const body = await boundedText(request, 1_048_576, AbortSignal.timeout(5000));
    if (!validWebhook(body, request.headers.get("x-hub-signature-256"), config.webhookSecret))
      return fail("invalid_signature", 401);
    const event = request.headers.get("x-github-event");
    if (event !== "installation" && event !== "installation_repositories")
      return json({ accepted: true });
    // Provider webhook payloads have evolving fields; validate the fields we consume.
    const data = z
      .object({
        action: z.string().max(100),
        installation: z.object({ id: z.number().int().positive().safe() }),
        repositories_removed: z
          .array(z.object({ id: z.number().int().positive().safe() }))
          .max(1000)
          .optional(),
      })
      .parse(JSON.parse(body));
    if (event === "installation" && ["deleted", "suspend"].includes(data.action)) {
      await this.db
        .update(githubConnection)
        .set({ active: false, version: crypto.randomUUID() })
        .where(eq(githubConnection.installationId, String(data.installation.id)));
    } else if (
      event === "installation_repositories" &&
      data.action === "removed" &&
      data.repositories_removed?.length
    ) {
      await this.db
        .update(githubConnection)
        .set({ active: false, version: crypto.randomUUID() })
        .where(
          and(
            eq(githubConnection.installationId, String(data.installation.id)),
            inArray(
              githubConnection.repositoryId,
              data.repositories_removed.map((repo) => String(repo.id)),
            ),
          ),
        );
    }
    // Replays can only disable a connection; reconnect explicitly revalidates access.
    return json({ accepted: true });
  }

  async handle(request: Request, userId: string | null): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/github/webhook" && request.method === "POST")
        return await this.webhook(request);
      if (!userId) return fail("unauthenticated", 401);
      if (url.pathname === "/api/v1/github/callback" && request.method === "GET")
        return await this.callback(request, userId);
      const match =
        /^\/api\/v1\/apps\/([^/]+)\/github(?:\/(connect|disconnect|repositories|installations|connection|issues)(?:\/([^/]+)(?:\/(reconcile))?)?)?$/.exec(
          url.pathname,
        );
      if (!match?.[1]) return fail("not_found", 404);
      const app = await ownedApplication(this.db, userId, match[1]);
      if (!app) return fail("not_found", 404);
      const method = request.method;
      let input: unknown;
      if (method === "POST") {
        if (
          request.headers.get("origin") !== url.origin ||
          (this.config && url.origin !== this.config.baseUrl)
        )
          return fail("denied_origin", 403);
        if (
          !/^application\/json(?:;\s*charset=utf-8)?$/i.test(
            request.headers.get("content-type") ?? "",
          )
        )
          return fail("invalid_input", 400);
        input = JSON.parse(
          await boundedText(request, 65_536, AbortSignal.timeout(5000)),
        ) as unknown;
      }
      if (this.config) await this.rateLimit(app);
      if (!match[2] && method === "GET") return json(await this.status(app, userId));
      if (method === "POST" && match[2] === "connect" && !match[3]) {
        empty.parse(input);
        return await this.start(app, userId);
      }
      if (method === "POST" && match[2] === "disconnect" && !match[3]) {
        empty.parse(input);
        return await this.disconnect(app);
      }
      if (method === "POST" && match[2] === "connection" && !match[3])
        return await this.bind(app, userId, input);
      if (
        method === "GET" &&
        ["installations", "repositories"].includes(match[2] ?? "") &&
        !match[3]
      ) {
        const query = pageQuery.parse(Object.fromEntries(url.searchParams));
        const token = await this.userToken(app, userId);
        const { client } = this.configured();
        if (match[2] === "installations")
          return json(await client.installations(token, query.page));
        if (!query.installationId) return fail("invalid_input", 400);
        return json(await client.repositories(token, query.installationId, query.page));
      }
      if (match[2] === "issues" && match[3]) {
        const report = await this.report(app, match[3]);
        if (method === "GET" && !match[4]) {
          const [row] = await this.db
            .select()
            .from(githubIssue)
            .where(eq(githubIssue.feedbackId, report.id));
          return json({
            ...(await this.status(app, userId)),
            draft: issueDraft(report),
            issue: row ? issueView(row) : null,
          });
        }
        if (method === "POST" && match[4] === "reconcile") {
          empty.parse(input);
          return await this.reconcile(app, userId, report.id);
        }
        if (method === "POST" && !match[4]) return await this.create(app, userId, report.id, input);
      }
      return fail("method_not_allowed", 405);
    } catch (error) {
      if (error instanceof GitHubError)
        return json({ error: { category: error.category } }, error.status);
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return json({ error: { category: "invalid_input" } }, 400);
      return json({ error: { category: "github_unavailable" } }, 502);
    }
  }
}

export function isGitHubRoute(path: string): boolean {
  return path.startsWith("/api/v1/github/") || /^\/api\/v1\/apps\/[^/]+\/github(?:\/|$)/.test(path);
}
