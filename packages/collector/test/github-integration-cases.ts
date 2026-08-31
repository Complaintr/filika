import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { runCleanup } from "../src/db/cleanup";
import type { Db } from "../src/db/client";
import {
  feedback,
  githubAuthorization,
  githubConnection,
  githubIssue,
  githubOauthState,
  project,
  user,
} from "../src/db/schema";
import { GitHubClient, GitHubError } from "../src/github/client";
import { encryptToken, type GitHubConfig, hashState } from "../src/github/config";
import { GitHubRoutes } from "../src/github/routes";

const config: GitHubConfig = {
  appId: "1",
  appSlug: "test",
  clientId: "test",
  clientSecret: "secret",
  privateKey: "unused",
  encryptionKey: "ab".repeat(32),
  webhookSecret: "webhook-test-secret",
  baseUrl: "http://localhost:4173",
};
class FakeGitHub extends GitHubClient {
  posts = 0;
  exchanges = 0;
  mode: "success" | "timeout" | "denied" = "success";
  writable = true;
  isPrivate = true;
  marker = "";
  override async exchangeCode() {
    this.exchanges++;
    return { token: "token", expiresAt: new Date(Date.now() + 600000), userId: "42" };
  }
  override async accessibleRepository(_token: string, id: string) {
    if (!this.writable) throw new GitHubError("repository_unavailable", 409, true);
    return { id, fullName: "owner/repo", isPrivate: this.isPrivate };
  }
  override async installationToken() {
    return "installation-token";
  }
  override async createIssue(_token: string, _repo: string, _title: string, body: string) {
    this.posts++;
    this.marker = body;
    if (this.mode === "timeout") throw new Error("network timeout");
    if (this.mode === "denied") throw new GitHubError("github_denied_or_limited", 502, true);
    return { number: 7, url: "https://github.com/owner/repo/issues/7" };
  }
  override async findIssue(_token: string, _repo: string, marker: string) {
    expect(this.marker).toContain(marker);
    return { number: 7, url: "https://github.com/owner/repo/issues/7" };
  }
}

export function registerGitHubIntegrationTests(getDb: () => Db, available: boolean) {
  async function fixture(
    run: (f: {
      db: Db;
      routes: GitHubRoutes;
      client: FakeGitHub;
      userId: string;
      projectId: string;
      reportId: string;
      prefix: string;
      approval: {
        connectionVersion: string;
        fullName: string;
        isPrivate: boolean;
        title: string;
        body: string;
      };
      call: (suffix: string, input?: unknown, actor?: string | null) => Promise<Response>;
    }) => Promise<void>,
  ) {
    const db = getDb();
    const userId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const reportId = crypto.randomUUID();
    const slug = `github-${projectId}`;
    await db.insert(user).values({ id: userId, name: "Owner", email: `${userId}@example.test` });
    await db.insert(project).values({
      id: projectId,
      ownerUserId: userId,
      slug,
      displayName: "GitHub test",
      projectKey: projectId,
      allowedOrigins: [],
    });
    await db.insert(feedback).values({
      id: reportId,
      projectId,
      eventId: crypto.randomUUID(),
      title: "Save fails",
      description: "Nothing happens",
      kind: "bug",
      origin: "https://example.test",
      sdkVersion: "1.0.0",
    });
    const version = crypto.randomUUID();
    await db.insert(githubAuthorization).values({
      projectId,
      userId,
      githubUserId: "42",
      encryptedToken: encryptToken("token", config.encryptionKey, `${projectId}:${userId}`),
      expiresAt: new Date(Date.now() + 600000),
    });
    await db.insert(githubConnection).values({
      projectId,
      version,
      installationId: "2",
      repositoryId: "3",
      fullName: "owner/repo",
      isPrivate: true,
    });
    const client = new FakeGitHub(config);
    const routes = new GitHubRoutes(db, config, client);
    const prefix = `${config.baseUrl}/api/v1/apps/${slug}/github`;
    const call = (suffix: string, input?: unknown, actor: string | null = userId) =>
      routes.handle(
        new Request(
          `${prefix}${suffix}`,
          input === undefined
            ? {}
            : {
                method: "POST",
                headers: { Origin: config.baseUrl, "Content-Type": "application/json" },
                body: JSON.stringify(input),
              },
        ),
        actor,
      );
    try {
      await run({
        db,
        routes,
        client,
        userId,
        projectId,
        reportId,
        prefix,
        call,
        approval: {
          connectionVersion: version,
          fullName: "owner/repo",
          isPrivate: true,
          title: "Reviewed title",
          body: "Reviewed description",
        },
      });
    } finally {
      await db.delete(feedback).where(eq(feedback.projectId, projectId));
      await db.delete(project).where(eq(project.id, projectId));
      await db.delete(user).where(eq(user.id, userId));
    }
  }

  describe.skipIf(!available)("GitHub integration with PostgreSQL", () => {
    test("isolates owners, rejects CSRF and preview changes, and never posts on reads", async () =>
      fixture(async (f) => {
        expect((await f.call("", undefined, null)).status).toBe(401);
        expect((await f.call("", undefined, "other-owner")).status).toBe(404);
        const read = await f.call(`/issues/${f.reportId}`);
        expect(read.status).toBe(200);
        expect((await read.json()).draft.title).toBe("Save fails");
        expect(f.client.posts).toBe(0);
        const csrf = await f.routes.handle(
          new Request(`${f.prefix}/issues/${f.reportId}`, {
            method: "POST",
            headers: { Origin: "https://evil.test", "Content-Type": "application/json" },
            body: JSON.stringify(f.approval),
          }),
          f.userId,
        );
        expect(csrf.status).toBe(403);
        expect(
          (await f.call(`/issues/${f.reportId}`, { ...f.approval, surprise: true })).status,
        ).toBe(400);
        expect(
          (
            await f.call(`/issues/${f.reportId}`, {
              ...f.approval,
              connectionVersion: crypto.randomUUID(),
            })
          ).status,
        ).toBe(409);
        f.client.isPrivate = false;
        expect((await f.call(`/issues/${f.reportId}`, f.approval)).status).toBe(409);
        f.client.isPrivate = true;
        f.client.writable = false;
        expect((await f.call(`/issues/${f.reportId}`, f.approval)).status).toBe(409);
        expect(f.client.posts).toBe(0);
      }));

    test("concurrent approvals create one durable issue and repeated approvals return it", async () =>
      fixture(async (f) => {
        const responses = await Promise.all([
          f.call(`/issues/${f.reportId}`, f.approval),
          f.call(`/issues/${f.reportId}`, f.approval),
        ]);
        expect(responses.every((r) => r.ok)).toBe(true);
        expect(f.client.posts).toBe(1);
        const retry = await f.call(`/issues/${f.reportId}`, f.approval);
        expect((await retry.json()).issue.url).toBe("https://github.com/owner/repo/issues/7");
        const [row] = await f.db
          .select()
          .from(githubIssue)
          .where(eq(githubIssue.feedbackId, f.reportId));
        expect(row?.approvedBy).toBe(f.userId);
        expect(f.client.marker).toContain("Reviewed description");
        expect(f.client.posts).toBe(1);
      }));

    test("ambiguous failures reconcile without a second POST", async () =>
      fixture(async (f) => {
        f.client.mode = "timeout";
        expect(
          (await (await f.call(`/issues/${f.reportId}`, f.approval)).json()).issue.status,
        ).toBe("uncertain");
        await f.call(`/issues/${f.reportId}`, f.approval);
        expect(f.client.posts).toBe(1);
        const reconciled = await f.call(`/issues/${f.reportId}/reconcile`, {});
        expect((await reconciled.json()).issue.status).toBe("created");
        expect(f.client.posts).toBe(1);
      }));

    test("definite rejection can be reviewed and retried; expired reports cannot be exported", async () =>
      fixture(async (f) => {
        f.client.mode = "denied";
        expect(
          (await (await f.call(`/issues/${f.reportId}`, f.approval)).json()).issue.status,
        ).toBe("failed");
        f.client.mode = "success";
        expect(
          (await (await f.call(`/issues/${f.reportId}`, f.approval)).json()).issue.status,
        ).toBe("created");
        await f.db
          .update(feedback)
          .set({ receiptTimestamp: new Date(Date.now() - 25 * 3600000) })
          .where(eq(feedback.id, f.reportId));
        expect((await f.call(`/issues/${f.reportId}`, f.approval)).status).toBe(404);
        await runCleanup(f.db, new Date());
        expect(
          await f.db.select().from(githubIssue).where(eq(githubIssue.feedbackId, f.reportId)),
        ).toHaveLength(0);
        expect(f.client.posts).toBe(2);
      }));

    test("OAuth state is user-bound, single-use and expires; disconnect removes credentials", async () =>
      fixture(async (f) => {
        const start = await f.call("/connect", {});
        const state = new URL((await start.json()).url).searchParams.get("state");
        const callback = new Request(
          `${config.baseUrl}/api/v1/github/callback?state=${state}&code=valid`,
        );
        expect((await f.routes.handle(callback, "other-owner")).status).toBe(400);
        expect(f.client.exchanges).toBe(0);
        expect((await f.routes.handle(callback, f.userId)).status).toBe(303);
        expect((await f.routes.handle(callback, f.userId)).status).toBe(400);
        expect(f.client.exchanges).toBe(1);
        const nextState =
          new URL((await (await f.call("/connect", {})).json()).url).searchParams.get("state") ??
          "";
        await f.db
          .update(githubOauthState)
          .set({ expiresAt: new Date(0) })
          .where(eq(githubOauthState.stateHash, hashState(nextState)));
        expect(
          (
            await f.routes.handle(
              new Request(`${config.baseUrl}/api/v1/github/callback?state=${nextState}&code=valid`),
              f.userId,
            )
          ).status,
        ).toBe(400);
        await f.call("/disconnect", {});
        expect(
          await f.db
            .select()
            .from(githubAuthorization)
            .where(eq(githubAuthorization.projectId, f.projectId)),
        ).toHaveLength(0);
        expect(
          await f.db
            .select()
            .from(githubConnection)
            .where(eq(githubConnection.projectId, f.projectId)),
        ).toHaveLength(0);
      }));

    test("signed webhook disables access, rejects tampering and tolerates replay", async () =>
      fixture(async (f) => {
        const body = JSON.stringify({ action: "deleted", installation: { id: 2 } });
        const signature = `sha256=${createHmac("sha256", config.webhookSecret).update(body).digest("hex")}`;
        const request = (sig: string) =>
          new Request(`${config.baseUrl}/api/v1/github/webhook`, {
            method: "POST",
            body,
            headers: { "x-hub-signature-256": sig, "x-github-event": "installation" },
          });
        expect((await f.routes.handle(request("invalid"), null)).status).toBe(401);
        expect((await f.routes.handle(request(signature), null)).status).toBe(200);
        expect((await f.routes.handle(request(signature), null)).status).toBe(200);
        expect((await f.call(`/issues/${f.reportId}`, f.approval)).status).toBe(409);
        expect(f.client.posts).toBe(0);
      }));
  });
}
