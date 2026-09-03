import { randomBytes, randomUUID } from "node:crypto";
import { makeSignature } from "better-auth/crypto";
import postgres from "postgres";
import { webOrigin } from "./web-origin";

/**
 * Produces the same cookie value Better Auth sets for a session token:
 * `<token>.<base64 HMAC-SHA-256 signature>` with URL encoding. The signature
 * format mirrors better-call's `signCookieValue` so `getSession` accepts it.
 */
async function signSessionToken(token: string, secret: string): Promise<string> {
  const signature = await makeSignature(token, secret);
  return encodeURIComponent(`${token}.${signature}`);
}

/**
 * Creates a user + session directly in the e2e database and returns the
 * signed cookie value to use for `better-auth.session_token`.
 *
 * Better Auth stores the session token verbatim in the `session.token` column
 * and looks it up by that value; the cookie carries the token signed with the
 * server secret.
 */
export async function seedE2eSession(
  databaseUrl: string,
  secret: string,
  options: { application?: boolean; google?: boolean; github?: boolean } = {},
): Promise<{
  cookieName: string;
  cookieValue: string;
  userId: string;
  slug: string;
  projectKey: string;
}> {
  const sql = postgres(databaseUrl, { prepare: false, max: 1 });
  try {
    const token = randomBytes(32).toString("hex");
    const userId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
      VALUES (${userId}, 'E2E Maintainer', ${`e2e-${randomUUID()}@filika.test`}, true, NULL, ${now}, ${now})
    `;
    await sql`
      INSERT INTO "session" (id, token, user_id, expires_at, ip_address, user_agent, created_at, updated_at)
      VALUES (${randomUUID()}, ${token}, ${userId}, ${expiresAt}, '127.0.0.1', 'playwright', ${now}, ${now})
    `;

    const slug = `app-${userId}`;
    const projectKey = `app_${userId.replaceAll("-", "")}`;
    if (options.application !== false) {
      await sql`INSERT INTO project (project_key, display_name, allowed_origins, owner_user_id, slug)
        VALUES (${projectKey}, 'My Store', ARRAY[${webOrigin}], ${userId}, ${slug})`;
    }
    if (options.google) {
      await sql`INSERT INTO account (id, user_id, account_id, provider_id, issuer)
        VALUES (${randomUUID()}, ${userId}, ${userId}, 'google', 'https://accounts.google.com')`;
    }
    if (options.github) {
      await sql`INSERT INTO account (id, user_id, account_id, provider_id, issuer)
        VALUES (${randomUUID()}, ${userId}, ${userId}, 'github', 'https://github.com')`;
    }
    return {
      userId,
      slug,
      projectKey,
      cookieName: "better-auth.session_token",
      cookieValue: await signSessionToken(token, secret),
    };
  } finally {
    await sql.end();
  }
}
