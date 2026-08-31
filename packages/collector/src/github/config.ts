import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  sign,
  timingSafeEqual,
} from "node:crypto";

export interface GitHubConfig {
  appId: string;
  appSlug: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
  encryptionKey: string;
  webhookSecret: string;
  baseUrl: string;
}

export function githubConfigFromEnv(): GitHubConfig | undefined {
  const appId = process.env.GITHUB_APP_ID;
  const appSlug = process.env.GITHUB_APP_SLUG;
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const encryptionKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (
    !appId ||
    !appSlug ||
    !clientId ||
    !clientSecret ||
    !privateKey ||
    !encryptionKey ||
    !webhookSecret ||
    !baseUrl
  )
    return undefined;
  if (
    !/^[1-9][0-9]*$/.test(appId) ||
    !/^[a-z0-9-]+$/.test(appSlug) ||
    !/^[a-f0-9]{64}$/i.test(encryptionKey) ||
    webhookSecret.length < 32
  )
    return undefined;
  if (!URL.canParse(baseUrl)) return undefined;
  const url = new URL(baseUrl);
  if (
    url.origin !== baseUrl ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
  )
    return undefined;
  return {
    appId,
    appSlug,
    clientId,
    clientSecret,
    privateKey: privateKey.replaceAll("\\n", "\n"),
    encryptionKey,
    webhookSecret,
    baseUrl,
  };
}

export const hashState = (state: string): string =>
  createHash("sha256").update(state).digest("hex");
export const newState = (): string => randomBytes(32).toString("base64url");

export function encryptToken(token: string, key: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decryptToken(value: string, key: string, context: string): string {
  const data = Buffer.from(value, "base64url");
  const cipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  cipher.setAAD(Buffer.from(context));
  return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8");
}

export function appJwt(config: GitHubConfig, now = Date.now()): string {
  const seconds = Math.floor(now / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iat: seconds - 60, exp: seconds + 540, iss: config.clientId }),
  ).toString("base64url");
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), config.privateKey).toString("base64url")}`;
}

export function validWebhook(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}
