import {
  authorizationUrlSchema,
  disconnectResultSchema,
  type GitHubIssueMode,
  githubStatusSchema,
  type IssueApproval,
  installationsSchema,
  issuePreviewSchema,
  issueResultSchema,
  repositoriesSchema,
} from "@filika/collector/github/contracts";
import { readBoundedJson } from "./response";

const errors: Record<string, string> = {
  rate_limited: "Too many GitHub requests for this application. Wait a minute before trying again.",
  github_not_configured: "GitHub integration is not configured on this server.",
  reauthorize:
    "Your GitHub authorization expired or was revoked. Reconnect in application settings.",
  connection_changed:
    "The repository or its visibility changed. Refresh and review the destination again.",
  repository_unavailable:
    "This repository needs write access and enabled issues. Archived repositories are unavailable.",
  github_denied_or_limited:
    "GitHub denied or rate-limited the request. Check access and try again later.",
  github_not_found:
    "GitHub access is unavailable. Check the app installation and selected repositories.",
  invalid_input: "Check the issue title, description and repository selection.",
  not_found: "This report or application is unavailable. The report may have expired.",
  unauthenticated: "Sign in to Filika again to continue.",
};

async function request<T>(
  path: string,
  schema: { parse(value: unknown): T },
  signal: AbortSignal,
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw: unknown = await readBoundedJson(response, 131_072);
  if (!response.ok) {
    const category =
      typeof raw === "object" &&
      raw !== null &&
      "error" in raw &&
      typeof raw.error === "object" &&
      raw.error !== null &&
      "category" in raw.error
        ? raw.error.category
        : null;
    throw new Error(
      typeof category === "string" && errors[category]
        ? errors[category]
        : "GitHub could not complete this request. Refresh the status before trying again.",
    );
  }
  return schema.parse(raw);
}

export function githubApi(slug: string) {
  const base = `/api/v1/apps/${encodeURIComponent(slug)}/github`;
  const issue = (id: string) => `${base}/issues/${encodeURIComponent(id)}`;
  return {
    status: (signal: AbortSignal) => request(base, githubStatusSchema, signal),
    connect: (signal: AbortSignal) =>
      request(`${base}/connect`, authorizationUrlSchema, signal, {}),
    disconnect: (signal: AbortSignal) =>
      request(`${base}/disconnect`, disconnectResultSchema, signal, {}),
    installations: (page: number, signal: AbortSignal) =>
      request(`${base}/installations?page=${page}`, installationsSchema, signal),
    repositories: (installationId: string, page: number, signal: AbortSignal) =>
      request(
        `${base}/repositories?installationId=${encodeURIComponent(installationId)}&page=${page}`,
        repositoriesSchema,
        signal,
      ),
    bind: (installationId: string, repositoryId: string, signal: AbortSignal) =>
      request(`${base}/connection`, githubStatusSchema, signal, { installationId, repositoryId }),
    mode: (mode: GitHubIssueMode, signal: AbortSignal) =>
      request(`${base}/mode`, githubStatusSchema, signal, { mode }),
    preview: (id: string, signal: AbortSignal) => request(issue(id), issuePreviewSchema, signal),
    create: (id: string, approval: IssueApproval, signal: AbortSignal) =>
      request(issue(id), issueResultSchema, signal, approval),
    reconcile: (id: string, signal: AbortSignal) =>
      request(`${issue(id)}/reconcile`, issueResultSchema, signal, {}),
  };
}
