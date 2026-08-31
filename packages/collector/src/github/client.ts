import { z } from "zod";
import { appJwt, type GitHubConfig } from "./config";
import { repositoryName } from "./contracts";

const numericId = z.number().int().positive().safe();
const repository = z.object({
  id: numericId,
  full_name: repositoryName,
  private: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean(),
  has_issues: z.boolean(),
  permissions: z.object({ push: z.boolean() }).optional(),
});
const installation = z.object({
  id: numericId,
  app_id: numericId,
  account: z.object({ login: z.string().max(100) }),
  suspended_at: z.string().nullable(),
  permissions: z.object({ issues: z.string().optional() }),
});
const issue = z.object({
  number: numericId,
  body: z.string().max(100_000).nullable(),
  user: z.object({ type: z.string(), login: z.string().max(100) }),
  pull_request: z.unknown().optional(),
});

export class GitHubError extends Error {
  constructor(
    public category: string,
    public status = 502,
    public definite = false,
  ) {
    super(category);
  }
}

export async function boundedText(
  response: Response | Request,
  limit: number,
  signal: AbortSignal,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new GitHubError("invalid_input", 400, true);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let length = 0;
  let text = "";
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) throw new GitHubError("payload_too_large", 413, true);
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    signal.removeEventListener("abort", abort);
    void reader.cancel().catch(() => {});
  }
}

export class GitHubClient {
  constructor(
    private config: GitHubConfig,
    private fetcher: typeof fetch = fetch,
  ) {}

  private async request(
    path: string,
    token: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    const signal = AbortSignal.timeout(10_000);
    const response = await this.fetcher(`https://api.github.com${path}`, {
      method,
      redirect: "error",
      signal,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      const category =
        response.status === 401
          ? "reauthorize"
          : response.status === 403 || response.status === 429
            ? "github_denied_or_limited"
            : response.status === 404
              ? "github_not_found"
              : "github_unavailable";
      throw new GitHubError(
        category,
        response.status === 401 ? 409 : 502,
        [401, 403, 404, 410, 422, 429].includes(response.status),
      );
    }
    try {
      return JSON.parse(await boundedText(response, 2_000_000, signal)) as unknown;
    } catch {
      // A successful HTTP status may already have created an issue. An unreadable
      // response (including a size limit) must never become a retryable rejection.
      throw new GitHubError("github_response_invalid");
    }
  }

  async exchangeCode(code: string): Promise<{ token: string; expiresAt: Date; userId: string }> {
    const signal = AbortSignal.timeout(10_000);
    const response = await this.fetcher("https://github.com/login/oauth/access_token", {
      method: "POST",
      redirect: "error",
      signal,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: `${this.config.baseUrl}/api/v1/github/callback`,
      }),
    });
    if (!response.ok) throw new GitHubError("reauthorize", 409, true);
    const data = z
      .object({
        access_token: z.string().min(1).max(2048),
        expires_in: z.number().positive().optional(),
      })
      .parse(JSON.parse(await boundedText(response, 16_384, signal)));
    const identity = z
      .object({ id: numericId })
      .parse(await this.request("/user", data.access_token));
    // Do not retain refresh tokens. Expiry requires explicit reauthorization.
    return {
      token: data.access_token,
      expiresAt: new Date(Date.now() + Math.min(data.expires_in ?? 28_800, 28_800) * 1000),
      userId: String(identity.id),
    };
  }

  async installations(token: string, page: number) {
    const data = z
      .object({ installations: z.array(installation).max(100) })
      .parse(await this.request(`/user/installations?per_page=100&page=${page}`, token));
    return {
      installations: data.installations
        .filter(
          (item) =>
            String(item.app_id) === this.config.appId &&
            item.suspended_at === null &&
            item.permissions.issues === "write",
        )
        .map((item) => ({ id: String(item.id), login: item.account.login })),
      nextPage: data.installations.length === 100 && page < 100 ? page + 1 : null,
    };
  }

  async repositories(token: string, installationId: string, page: number) {
    const data = z
      .object({ repositories: z.array(repository).max(100) })
      .parse(
        await this.request(
          `/user/installations/${installationId}/repositories?per_page=100&page=${page}`,
          token,
        ),
      );
    return {
      repositories: data.repositories
        .filter((repo) => !repo.archived && !repo.disabled && repo.has_issues)
        .map((repo) => ({
          id: String(repo.id),
          fullName: repo.full_name,
          isPrivate: repo.private,
        })),
      nextPage: data.repositories.length === 100 && page < 100 ? page + 1 : null,
    };
  }

  async accessibleRepository(userToken: string, repositoryId: string) {
    const repo = repository.parse(await this.request(`/repositories/${repositoryId}`, userToken));
    if (
      String(repo.id) !== repositoryId ||
      !repo.permissions?.push ||
      repo.archived ||
      repo.disabled ||
      !repo.has_issues
    )
      throw new GitHubError("repository_unavailable", 409, true);
    return { id: String(repo.id), fullName: repo.full_name, isPrivate: repo.private };
  }

  async installationToken(installationId: string, repositoryId: string): Promise<string> {
    // GitHub verifies installation ownership, selected-repository access and permissions.
    const result = z
      .object({ token: z.string().min(1).max(2048) })
      .parse(
        await this.request(
          `/app/installations/${installationId}/access_tokens`,
          appJwt(this.config),
          "POST",
          { repository_ids: [Number(repositoryId)], permissions: { issues: "write" } },
        ),
      );
    return result.token;
  }

  async createIssue(token: string, fullName: string, title: string, body: string) {
    const result = issue.parse(
      await this.request(`/repos/${fullName}/issues`, token, "POST", { title, body }),
    );
    return { number: result.number, url: `https://github.com/${fullName}/issues/${result.number}` };
  }

  async findIssue(token: string, fullName: string, marker: string, since: Date) {
    // A bounded read only reconciliation; absence never licenses a second POST.
    for (let page = 1; page <= 5; page++) {
      const rows = z
        .array(issue)
        .max(100)
        .parse(
          await this.request(
            `/repos/${fullName}/issues?state=all&sort=created&direction=desc&per_page=100&page=${page}&since=${encodeURIComponent(since.toISOString())}`,
            token,
          ),
        );
      const found = rows.find(
        (row) =>
          !row.pull_request &&
          row.user.type === "Bot" &&
          row.user.login === `${this.config.appSlug}[bot]` &&
          row.body?.includes(marker),
      );
      if (found)
        return {
          number: found.number,
          url: `https://github.com/${fullName}/issues/${found.number}`,
        };
      if (rows.length < 100) break;
    }
    return null;
  }
}
