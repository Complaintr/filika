import {
  CONFIG_LIMITS,
  CONFIG_SCHEMA,
  DEVELOPMENT_ENDPOINT_HOSTS,
  type FilikaConfig,
} from "./config";
import { FEEDBACK_LIMITS } from "./envelope";
import { boundedString, closedRecord } from "./validation";

export function parseConfig(input: unknown, development = false): Readonly<FilikaConfig> | null {
  const value = closedRecord(input, ["projectKey", "endpoint", "routeLabel", "applicationRelease"]);
  if (
    !value ||
    !boundedString(value.projectKey, FEEDBACK_LIMITS.projectKey, true) ||
    /[^A-Za-z0-9_-]/u.test(value.projectKey) ||
    !boundedString(value.endpoint, CONFIG_LIMITS.endpoint, true) ||
    /[\s\\?#@]/u.test(value.endpoint)
  )
    return null;
  try {
    const url = new URL(value.endpoint);
    if (!url.hostname || url.username || url.password || url.search || url.hash) return null;
    const https =
      new RegExp(CONFIG_SCHEMA.properties.endpoint.pattern).test(value.endpoint) &&
      url.protocol === "https:";
    const localHttp =
      development &&
      url.protocol === "http:" &&
      DEVELOPMENT_ENDPOINT_HOSTS.some((host) => host === url.hostname) &&
      /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?(?:\/|$)/u.test(value.endpoint);
    if (!https && !localHttp) return null;
    const result: FilikaConfig = { projectKey: value.projectKey, endpoint: value.endpoint };
    for (const key of ["routeLabel", "applicationRelease"] as const) {
      if (Object.hasOwn(value, key)) {
        const label = value[key];
        if (!boundedString(label, FEEDBACK_LIMITS[key], true)) return null;
        result[key] = label;
      }
    }
    return Object.freeze(result);
  } catch {
    return null;
  }
}
