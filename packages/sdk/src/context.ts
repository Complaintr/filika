import type { FilikaConfig } from "./config";
import type { FilikaFeedbackContextV1 } from "./envelope";
import { closedRecord } from "./validation";
import { version } from "./version";

export function createContext(config: Readonly<FilikaConfig>): Readonly<FilikaFeedbackContextV1> {
  const context: FilikaFeedbackContextV1 = { sdkVersion: version };
  if (config.routeLabel !== undefined) context.routeLabel = config.routeLabel;
  if (config.applicationRelease !== undefined)
    context.applicationRelease = config.applicationRelease;
  return Object.freeze(context);
}

/** Review may remove host labels, but cannot introduce or change them. */
export function reviewedContext(
  input: unknown,
  original: Readonly<FilikaFeedbackContextV1>,
): FilikaFeedbackContextV1 | null {
  const value = closedRecord(input, ["sdkVersion", "routeLabel", "applicationRelease"]);
  if (!value || value.sdkVersion !== original.sdkVersion) return null;
  const result: FilikaFeedbackContextV1 = { sdkVersion: original.sdkVersion };
  for (const key of ["routeLabel", "applicationRelease"] as const) {
    if (Object.hasOwn(value, key)) {
      if (typeof value[key] !== "string" || value[key] !== original[key]) return null;
      result[key] = value[key];
    }
  }
  return result;
}
