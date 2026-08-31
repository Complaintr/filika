import { z } from "zod";

export const githubId = z
  .string()
  .regex(/^[1-9][0-9]{0,15}$/)
  .refine((id) => Number.isSafeInteger(Number(id)));
export const repositoryName = z
  .string()
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/)
  .refine((name) => ![".", ".."].includes(name.split("/")[1] ?? ""));
export const repositorySelection = z
  .object({ installationId: githubId, repositoryId: githubId })
  .strict();
export const issueApproval = z
  .object({
    connectionVersion: z.uuid(),
    fullName: repositoryName,
    isPrivate: z.boolean(),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(12_000),
  })
  .strict();

export const connectionViewSchema = z
  .object({
    version: z.uuid(),
    installationId: githubId,
    repositoryId: githubId,
    fullName: repositoryName,
    isPrivate: z.boolean(),
    active: z.boolean(),
  })
  .strict();
export const issueViewSchema = z
  .object({
    status: z.enum(["pending", "created", "uncertain", "failed"]),
    number: z.number().int().positive().nullable(),
    url: z
      .string()
      .max(500)
      .regex(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/[1-9][0-9]*$/)
      .nullable(),
    fullName: repositoryName,
  })
  .strict();
export const githubStatusSchema = z
  .object({
    configured: z.boolean(),
    authorized: z.boolean(),
    installUrl: z
      .string()
      .regex(/^https:\/\/github\.com\/apps\/[a-z0-9-]+\/installations\/new$/)
      .nullable(),
    connection: connectionViewSchema.nullable(),
  })
  .strict();
export const installationsSchema = z
  .object({
    installations: z
      .array(z.object({ id: githubId, login: z.string().max(100) }).strict())
      .max(100),
    nextPage: z.number().int().positive().nullable(),
  })
  .strict();
export const repositoriesSchema = z
  .object({
    repositories: z
      .array(z.object({ id: githubId, fullName: repositoryName, isPrivate: z.boolean() }).strict())
      .max(100),
    nextPage: z.number().int().positive().nullable(),
  })
  .strict();

export type GitHubStatus = z.infer<typeof githubStatusSchema>;
export type GitHubIssueView = z.infer<typeof issueViewSchema>;

export const issuePreviewSchema = githubStatusSchema.extend({
  draft: z.object({ title: z.string().max(160), body: z.string().max(12_000) }).strict(),
  issue: issueViewSchema.nullable(),
});
export const issueResultSchema = z.object({ issue: issueViewSchema }).strict();
export const authorizationUrlSchema = z
  .object({
    url: z
      .string()
      .max(2048)
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          url.origin === "https://github.com" &&
          url.pathname === "/login/oauth/authorize" &&
          !url.username &&
          !url.password
        );
      }),
  })
  .strict();
export const disconnectResultSchema = z.object({ disconnected: z.literal(true) }).strict();
export type IssuePreview = z.infer<typeof issuePreviewSchema>;
export type IssueApproval = z.infer<typeof issueApproval>;

export function issueMarker(operationId: string): string {
  return `<!-- filika-issue:${operationId} -->`;
}

export function issueDraft(report: {
  title: string;
  description: string;
  expectedBehavior: string | null;
  reproductionSteps: string[] | null;
  routeLabel: string | null;
  applicationRelease: string | null;
}): { title: string; body: string } {
  // Report text is data, never instructions. The owner reviews this plain-text draft.
  const parts = ["## What happened", report.description];
  if (report.expectedBehavior) parts.push("## Expected behavior", report.expectedBehavior);
  if (report.reproductionSteps?.length)
    parts.push(
      "## Steps to reproduce",
      report.reproductionSteps.map((step, i) => `${i + 1}. ${step}`).join("\n"),
    );
  if (report.routeLabel) parts.push("## Page", report.routeLabel);
  if (report.applicationRelease) parts.push("## Release", report.applicationRelease);
  return { title: report.title, body: parts.join("\n\n") };
}
