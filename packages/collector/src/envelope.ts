import { z } from "zod";

export const FEEDBACK_KINDS = ["bug", "blocked", "confusing", "idea"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const ENVELOPE_FIELD_LIMITS = {
  applicationReleaseMax: 200,
  contextLabelMax: 64,
  contextValueMax: 500,
  descriptionMax: 4000,
  expectedBehaviorMax: 4000,
  optionalContextMax: 20,
  projectKeyMax: 128,
  reproductionStepsMax: 4000,
  routeLabelMax: 200,
  titleMax: 200,
} as const;

const contextItemSchema = z
  .object({
    label: z.string().min(1).max(ENVELOPE_FIELD_LIMITS.contextLabelMax),
    value: z.string().min(1).max(ENVELOPE_FIELD_LIMITS.contextValueMax),
  })
  .strict();

export const FILIKA_FEEDBACK_ENVELOPE_V1 = z
  .object({
    applicationRelease: z
      .string()
      .min(1)
      .max(ENVELOPE_FIELD_LIMITS.applicationReleaseMax)
      .optional(),
    description: z.string().min(1).max(ENVELOPE_FIELD_LIMITS.descriptionMax),
    eventId: z.uuid(),
    expectedBehavior: z.string().min(1).max(ENVELOPE_FIELD_LIMITS.expectedBehaviorMax),
    kind: z.enum(FEEDBACK_KINDS),
    optionalContext: z
      .array(contextItemSchema)
      .max(ENVELOPE_FIELD_LIMITS.optionalContextMax)
      .optional(),
    projectKey: z.string().min(1).max(ENVELOPE_FIELD_LIMITS.projectKeyMax),
    reproductionSteps: z.string().min(1).max(ENVELOPE_FIELD_LIMITS.reproductionStepsMax),
    routeLabel: z.string().min(1).max(ENVELOPE_FIELD_LIMITS.routeLabelMax).optional(),
    title: z.string().min(1).max(ENVELOPE_FIELD_LIMITS.titleMax),
  })
  .strict();

export type FilikaFeedbackEnvelopeV1 = z.infer<typeof FILIKA_FEEDBACK_ENVELOPE_V1>;
