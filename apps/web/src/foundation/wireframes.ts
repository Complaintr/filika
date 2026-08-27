export const WIREFRAME_IDS = [
  "sample_application",
  "feedback_dialog",
  "receipt",
  "inbox_list",
  "inbox_detail",
] as const;

export type WireframeId = (typeof WIREFRAME_IDS)[number];

export interface WireframeRegion {
  id: string;
  purpose: string;
}

export interface LowFidelityWireframe {
  actions: readonly string[];
  id: WireframeId;
  regions: readonly WireframeRegion[];
}

export const LOW_FIDELITY_WIREFRAMES = {
  feedback_dialog: {
    actions: ["Edit report", "Remove optional context", "Review", "Cancel", "Confirm"],
    id: "feedback_dialog",
    regions: [
      { id: "dialog_heading", purpose: "Names the modal review task." },
      { id: "privacy_summary", purpose: "Explains destination, retention, and privacy." },
      { id: "report_fields", purpose: "Contains editable agent-authored fields." },
      { id: "context_items", purpose: "Separates removable host-supplied context." },
      { id: "error_summary", purpose: "Links bounded errors to invalid fields." },
      { id: "dialog_actions", purpose: "Keeps the primary action before Cancel." },
    ],
  },
  inbox_detail: {
    actions: ["Return to inbox"],
    id: "inbox_detail",
    regions: [
      { id: "back_navigation", purpose: "Returns to the inbox list." },
      { id: "detail_heading", purpose: "Uses the report title as the page heading." },
      { id: "authored_report", purpose: "Groups agent-authored report fields." },
      { id: "host_context", purpose: "Groups host-supplied context." },
      { id: "request_facts", purpose: "Groups server-derived facts and expiry." },
    ],
  },
  inbox_list: {
    actions: ["Open feedback detail"],
    id: "inbox_list",
    regions: [
      { id: "inbox_heading", purpose: "Names the read-only maintainer inbox." },
      { id: "list_status", purpose: "Hosts loading, empty, and error states." },
      { id: "feedback_rows", purpose: "Shows bounded report summaries." },
      { id: "pagination", purpose: "Provides bounded list navigation." },
    ],
  },
  receipt: {
    actions: ["Close"],
    id: "receipt",
    regions: [
      { id: "receipt_heading", purpose: "Distinguishes success from duplicate receipt." },
      { id: "receipt_facts", purpose: "Shows only feedback ID and receipt time." },
      { id: "receipt_status", purpose: "Announces the bounded execution result." },
      { id: "receipt_actions", purpose: "Closes the completed flow." },
    ],
  },
  sample_application: {
    actions: ["Run sample task", "Reset sample", "Send feedback"],
    id: "sample_application",
    regions: [
      { id: "sample_heading", purpose: "Explains the deterministic sample." },
      { id: "normal_task", purpose: "Shows the normal task before failure." },
      { id: "failure_panel", purpose: "Shows stable failure and reset states." },
      { id: "manual_feedback", purpose: "Keeps manual feedback always available." },
    ],
  },
} as const satisfies Record<WireframeId, LowFidelityWireframe>;
