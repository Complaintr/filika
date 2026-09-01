import { and, eq } from "drizzle-orm";
import { hasFeedbackExpired } from "../cleanup";
import type { Db } from "../db/client";
import { feedback, githubConnection, githubIssue, type Project, project } from "../db/schema";
import { type GitHubClient, GitHubError } from "./client";
import { issueMarker } from "./contracts";

export type GitHubIssueRow = typeof githubIssue.$inferSelect;
export type GitHubIssueTrigger = GitHubIssueRow["trigger"];

function fail(category: string, status: number): never {
  throw new GitHubError(category, status, true);
}

export async function reserveGitHubIssue(
  db: Db,
  input: {
    app: Project;
    feedbackId: string;
    approvedBy: string;
    trigger: GitHubIssueTrigger;
    connectionVersion?: string;
  },
): Promise<{ row: GitHubIssueRow; send: boolean }> {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: project.id })
      .from(project)
      .where(eq(project.id, input.app.id))
      .for("update");
    const [connection] = await tx
      .select()
      .from(githubConnection)
      .where(eq(githubConnection.projectId, input.app.id));
    if (
      !connection?.active ||
      (input.connectionVersion !== undefined && connection.version !== input.connectionVersion)
    )
      return fail("connection_changed", 409);
    const [report] = await tx
      .select()
      .from(feedback)
      .where(and(eq(feedback.id, input.feedbackId), eq(feedback.projectId, input.app.id)))
      .for("update");
    if (
      !report ||
      hasFeedbackExpired(report.receiptTimestamp, new Date(), input.app.retentionHours)
    )
      return fail("not_found", 404);
    const [previous] = await tx
      .select()
      .from(githubIssue)
      .where(eq(githubIssue.feedbackId, input.feedbackId));
    if (previous && previous.status !== "failed") return { row: previous, send: false };
    const values = {
      feedbackId: input.feedbackId,
      projectId: input.app.id,
      approvedBy: input.approvedBy,
      installationId: connection.installationId,
      repositoryId: connection.repositoryId,
      fullName: connection.fullName,
      trigger: input.trigger,
      status: "pending" as const,
      startedAt: new Date(),
    };
    const [row] = previous
      ? await tx
          .update(githubIssue)
          .set(values)
          .where(eq(githubIssue.feedbackId, input.feedbackId))
          .returning()
      : await tx.insert(githubIssue).values(values).returning();
    if (!row) return fail("internal_error", 500);
    return { row, send: true };
  });
}

export async function sendReservedGitHubIssue(
  db: Db,
  client: GitHubClient,
  row: GitHubIssueRow,
  draft: { title: string; body: string },
  token?: string,
): Promise<{ row: GitHubIssueRow; created: boolean }> {
  let result: { number: number; url: string };
  try {
    const installationToken =
      token ?? (await client.installationToken(row.installationId, row.repositoryId));
    result = await client.createIssue(
      installationToken,
      row.fullName,
      draft.title,
      `${draft.body}\n\n${issueMarker(row.operationId)}`,
    );
  } catch (error) {
    const status = error instanceof GitHubError && error.definite ? "failed" : "uncertain";
    await db
      .update(githubIssue)
      .set({ status })
      .where(and(eq(githubIssue.feedbackId, row.feedbackId), eq(githubIssue.status, "pending")));
    return { row: { ...row, status }, created: false };
  }
  await db
    .update(githubIssue)
    .set({ status: "created", issueNumber: result.number, issueUrl: result.url })
    .where(eq(githubIssue.feedbackId, row.feedbackId));
  return {
    created: true,
    row: {
      ...row,
      status: "created",
      issueNumber: result.number,
      issueUrl: result.url,
    },
  };
}

export async function reconcileReservedGitHubIssue(
  db: Db,
  client: GitHubClient,
  row: GitHubIssueRow,
): Promise<GitHubIssueRow> {
  const token = await client.installationToken(row.installationId, row.repositoryId);
  const found = await client.findIssue(
    token,
    row.fullName,
    issueMarker(row.operationId),
    new Date(row.startedAt.getTime() - 60_000),
  );
  if (!found) return { ...row, status: "uncertain" };
  await db
    .update(githubIssue)
    .set({ status: "created", issueNumber: found.number, issueUrl: found.url })
    .where(eq(githubIssue.feedbackId, row.feedbackId));
  return {
    ...row,
    status: "created",
    issueNumber: found.number,
    issueUrl: found.url,
  };
}
