import { z } from "zod";

export const FEEDBACK_KINDS = ["bug", "blocked_task", "confusing_behavior", "idea"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const ENVELOPE_FIELD_LIMITS = {
  applicationReleaseMax: 80,
  descriptionMax: 4000,
  envelopeBytes: 32_768,
  expectedBehaviorMax: 2000,
  projectKeyMax: 128,
  reproductionStepMax: 500,
  reproductionStepsMax: 10,
  routeLabelMax: 120,
  sdkVersionMax: 32,
  titleMax: 160,
} as const;

export const UUID_V4_PATTERN =
  "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

const UUID_V4_REGEX = new RegExp(UUID_V4_PATTERN);

const NON_BLANK_PATTERN = /\S/;
const PROJECT_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;
const SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

/**
 * Count Unicode code points instead of UTF-16 code units so astral characters
 * (for example emoji) are bounded the same way the SDK counts them.
 */
function codePointLength(value: string): number {
  let length = 0;
  for (const _ of value) {
    length += 1;
  }
  return length;
}

function maxCodePoints(maxLength: number) {
  return (value: string) => codePointLength(value) <= maxLength;
}

function nonBlankString(maxLength: number): z.ZodString {
  return z.string().min(1).regex(NON_BLANK_PATTERN).refine(maxCodePoints(maxLength));
}

const projectKeySchema = z
  .string()
  .min(1)
  .max(ENVELOPE_FIELD_LIMITS.projectKeyMax)
  .regex(PROJECT_KEY_PATTERN);

const feedbackSchema = z
  .object({
    kind: z.enum(FEEDBACK_KINDS),
    title: nonBlankString(ENVELOPE_FIELD_LIMITS.titleMax),
    description: nonBlankString(ENVELOPE_FIELD_LIMITS.descriptionMax),
    expectedBehavior: z
      .string()
      .refine(maxCodePoints(ENVELOPE_FIELD_LIMITS.expectedBehaviorMax))
      .optional(),
    reproductionSteps: z
      .array(nonBlankString(ENVELOPE_FIELD_LIMITS.reproductionStepMax))
      .max(ENVELOPE_FIELD_LIMITS.reproductionStepsMax)
      .optional(),
  })
  .strict();

const contextSchema = z
  .object({
    sdkVersion: z.string().min(5).max(ENVELOPE_FIELD_LIMITS.sdkVersionMax).regex(SEMVER_PATTERN),
    routeLabel: nonBlankString(ENVELOPE_FIELD_LIMITS.routeLabelMax).optional(),
    applicationRelease: nonBlankString(ENVELOPE_FIELD_LIMITS.applicationReleaseMax).optional(),
  })
  .strict();

const LONE_SURROGATE_PATTERN =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

export function hasLoneSurrogates(value: unknown): boolean {
  if (typeof value === "string") {
    return LONE_SURROGATE_PATTERN.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(hasLoneSurrogates);
  }

  if (value !== null && typeof value === "object") {
    return Object.values(value).some(hasLoneSurrogates);
  }

  return false;
}

export const FILIKA_FEEDBACK_ENVELOPE_V1 = z
  .object({
    schemaVersion: z.literal(1),
    projectKey: projectKeySchema,
    eventId: z.string().min(36).max(36).regex(UUID_V4_REGEX),
    feedback: feedbackSchema,
    context: contextSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (hasLoneSurrogates(value)) {
      context.addIssue({
        code: "custom",
        message: "Ill-formed Unicode is not allowed.",
      });
    }
  });

export type FilikaFeedbackEnvelopeV1 = z.infer<typeof FILIKA_FEEDBACK_ENVELOPE_V1>;
