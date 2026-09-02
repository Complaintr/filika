import type { Application } from "./applications-api";
import { InboxApiService } from "./inbox-api";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function parseDemoApplication(value: unknown): Application {
  if (
    !record(value) ||
    !text(value.slug, 48) ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.slug) ||
    !text(value.displayName, 60) ||
    value.kind !== "demo" ||
    !text(value.projectKey, 128) ||
    !Array.isArray(value.allowedOrigins) ||
    value.allowedOrigins.length > 20 ||
    !value.allowedOrigins.every((item: unknown) => text(item, 2048)) ||
    ![7, 30, 90].includes(Number(value.dashboardDays)) ||
    typeof value.retentionHours !== "number" ||
    !Number.isInteger(value.retentionHours) ||
    value.retentionHours < 1
  )
    throw new Error("Invalid demo application response.");
  return {
    slug: value.slug,
    displayName: value.displayName,
    integrationVerifiedAt: null,
    kind: "demo",
    projectKey: value.projectKey,
    allowedOrigins: value.allowedOrigins as string[],
    dashboardDays: value.dashboardDays as 7 | 30 | 90,
    retentionHours: value.retentionHours,
  };
}

export interface DemoApi {
  fetchApplication(signal: AbortSignal): Promise<Application>;
  inbox: InboxApiService;
}

export function demoApi(deviceKey: string): DemoApi {
  const demoPrefix = `/api/v1/demo/${encodeURIComponent(deviceKey)}`;
  return {
    fetchApplication: async (signal) => {
      const response = await fetch(`${demoPrefix}/app`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      });
      if (!response.ok) throw new Error("The demo could not be reached.");
      const raw: unknown = await response.json();
      if (!record(raw) || !("application" in raw))
        throw new Error("Invalid demo application response.");
      return parseDemoApplication(raw.application);
    },
    inbox: new InboxApiService({
      collectorOrigin: "",
      appSlug: "",
      demoPrefix,
    }),
  };
}
