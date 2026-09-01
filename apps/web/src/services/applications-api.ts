import { googlePhotoUrl } from "@filika/collector/photo-url";
import { readBoundedJson } from "./response";

export interface Application {
  slug: string;
  displayName: string;
  integrationVerifiedAt: string | null;
  projectKey: string;
  allowedOrigins: string[];
  dashboardDays: 7 | 30 | 90;
  retentionHours: number;
}
export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  googleConnected: boolean;
  googleImageAvailable: boolean;
  useGoogleImage: boolean;
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
}
export type AccountSettings = Pick<AccountProfile, "name" | "useGoogleImage" | "theme" | "density">;
export type ApplicationSettings = Pick<
  Application,
  "displayName" | "allowedOrigins" | "dashboardDays"
>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
function parseApplication(value: unknown): Application {
  if (
    !record(value) ||
    !text(value.slug, 48) ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.slug) ||
    !text(value.displayName, 60) ||
    !(
      value.integrationVerifiedAt === null ||
      (text(value.integrationVerifiedAt, 40) &&
        Number.isFinite(Date.parse(value.integrationVerifiedAt)))
    ) ||
    !text(value.projectKey, 128) ||
    !Array.isArray(value.allowedOrigins) ||
    value.allowedOrigins.length > 20 ||
    !value.allowedOrigins.every((item: unknown) => text(item, 2048)) ||
    ![7, 30, 90].includes(Number(value.dashboardDays)) ||
    typeof value.dashboardDays !== "number" ||
    typeof value.retentionHours !== "number" ||
    !Number.isInteger(value.retentionHours) ||
    value.retentionHours < 1
  )
    throw new Error("Invalid application response.");
  return {
    slug: value.slug,
    displayName: value.displayName,
    integrationVerifiedAt: value.integrationVerifiedAt as string | null,
    projectKey: value.projectKey,
    allowedOrigins: value.allowedOrigins as string[],
    dashboardDays: value.dashboardDays as 7 | 30 | 90,
    retentionHours: value.retentionHours,
  };
}
function parseAccount(value: unknown): AccountProfile {
  if (
    !record(value) ||
    !text(value.id, 200) ||
    !text(value.name, 200) ||
    !text(value.email, 320) ||
    !(value.image === null || text(value.image, 2048)) ||
    typeof value.googleConnected !== "boolean" ||
    typeof value.googleImageAvailable !== "boolean" ||
    typeof value.useGoogleImage !== "boolean" ||
    !["light", "dark", "system"].includes(String(value.theme)) ||
    !["compact", "comfortable"].includes(String(value.density))
  )
    throw new Error("Invalid account response.");
  let image: string | null = null;
  if (value.useGoogleImage && value.googleConnected) {
    image = googlePhotoUrl(value.image);
  }
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    image,
    googleConnected: value.googleConnected,
    googleImageAvailable: value.googleImageAvailable,
    useGoogleImage: value.useGoogleImage,
    theme: value.theme as AccountProfile["theme"],
    density: value.density as AccountProfile["density"],
  };
}

async function request(path: string, signal: AbortSignal, method = "GET", body?: unknown) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 401) {
    window.location.replace("/login?force=1");
    throw new Error("Sign in to continue.");
  }
  const raw = await readBoundedJson(response);
  if (!response.ok) {
    const category = record(raw) && record(raw.error) ? raw.error.category : null;
    if (category === "slug_taken")
      throw new Error("This application URL is already in use. Choose another.");
    if (category === "google_photo_unavailable")
      throw new Error("Sign in with Google again to make your Google photo available.");
    if (category === "invalid_input")
      throw new Error("Check the fields and allowed origins, then try again.");
    throw new Error("Your changes could not be loaded or saved. Please try again.");
  }
  if (!record(raw)) throw new Error("Invalid response.");
  return raw;
}
export async function fetchApplications(signal: AbortSignal): Promise<Application[]> {
  const raw = await request("/api/v1/apps", signal);
  if (!Array.isArray(raw.applications) || raw.applications.length > 100)
    throw new Error("Invalid application list.");
  return raw.applications.map(parseApplication);
}
export async function fetchApplication(slug: string, signal: AbortSignal): Promise<Application> {
  const raw = await request(`/api/v1/apps/${encodeURIComponent(slug)}`, signal);
  return parseApplication(raw.application);
}
export async function createApplication(
  input: ApplicationSettings & { slug: string },
  signal: AbortSignal,
) {
  return parseApplication((await request("/api/v1/apps", signal, "POST", input)).application);
}
export async function saveApplication(
  slug: string,
  input: ApplicationSettings,
  signal: AbortSignal,
) {
  return parseApplication(
    (await request(`/api/v1/apps/${encodeURIComponent(slug)}`, signal, "PATCH", input)).application,
  );
}
export async function fetchAccount(signal: AbortSignal) {
  return parseAccount((await request("/api/v1/account", signal)).account);
}
export async function saveAccount(input: Partial<AccountSettings>, signal: AbortSignal) {
  return parseAccount((await request("/api/v1/account", signal, "PATCH", input)).account);
}
export function applicationPath(slug: string, page: "dashboard" | "complaints" | "settings") {
  return `/${encodeURIComponent(slug)}/${page}`;
}
