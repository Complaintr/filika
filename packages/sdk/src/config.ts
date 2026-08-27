import { FEEDBACK_ENVELOPE_SCHEMA, PROJECT_KEY_SCHEMA } from "./envelope";

export interface FilikaConfig {
  projectKey: string;
  endpoint: string;
  routeLabel?: string;
  applicationRelease?: string;
}

export const CONFIG_LIMITS = { endpoint: 2_048 } as const;

export const CONFIG_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  additionalProperties: false,
  required: ["projectKey", "endpoint"],
  properties: {
    projectKey: PROJECT_KEY_SCHEMA,
    endpoint: {
      type: "string",
      minLength: 1,
      maxLength: CONFIG_LIMITS.endpoint,
      format: "uri",
      pattern: "^https://[^\\s/?#@\\\\]+(?:/[^\\s?#\\\\]*)?$",
    },
    routeLabel: FEEDBACK_ENVELOPE_SCHEMA.properties.context.properties.routeLabel,
    applicationRelease: FEEDBACK_ENVELOPE_SCHEMA.properties.context.properties.applicationRelease,
  },
} as const;

export const CONFIG_SCRIPT_ATTRIBUTES = {
  projectKey: "data-project-key",
  endpoint: "data-endpoint",
  routeLabel: "data-route-label",
  applicationRelease: "data-application-release",
} as const satisfies Record<keyof FilikaConfig, string>;

export const DEVELOPMENT_ENDPOINT_HOSTS = ["localhost", "127.0.0.1", "[::1]"] as const;
