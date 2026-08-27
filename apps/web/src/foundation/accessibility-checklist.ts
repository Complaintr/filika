export const ACCESSIBILITY_CHECK_IDS = [
  "native_dialog",
  "initial_focus",
  "focus_containment",
  "focus_return",
  "keyboard_navigation",
  "validation_association",
  "live_region",
  "visible_focus",
  "reduced_motion",
  "named_removal_controls",
] as const;

export type AccessibilityCheckId = (typeof ACCESSIBILITY_CHECK_IDS)[number];

export interface AccessibilityCheck {
  id: AccessibilityCheckId;
  requirement: string;
  verification: string;
}

export const ACCESSIBILITY_CHECKLIST: readonly AccessibilityCheck[] = [
  {
    id: "native_dialog",
    requirement: "Open the review surface with native dialog.showModal().",
    verification: "Confirm background content is inert while the modal is open.",
  },
  {
    id: "initial_focus",
    requirement: "Focus the first invalid editable field, or the first editable field.",
    verification: "Open empty and prefilled drafts with keyboard and pointer input.",
  },
  {
    id: "focus_containment",
    requirement: "Keep Tab and Shift+Tab inside the open modal.",
    verification: "Cycle in both directions from the first and last visible controls.",
  },
  {
    id: "focus_return",
    requirement: "Return focus to the connected invoker after close.",
    verification: "Close from success, cancellation, and error states.",
  },
  {
    id: "keyboard_navigation",
    requirement: "Support Tab, Shift+Tab, Enter, Space, and Escape without a pointer.",
    verification: "Complete edit, removal, confirmation, cancellation, and retry flows.",
  },
  {
    id: "validation_association",
    requirement: "Connect each bounded error to its field and an error summary link.",
    verification: "Inspect accessible descriptions, aria-invalid, and focus movement.",
  },
  {
    id: "live_region",
    requirement: "Announce submission and outcomes once through a polite atomic status region.",
    verification: "Exercise success, duplicate, timeout, rejection, and unknown outcomes.",
  },
  {
    id: "visible_focus",
    requirement: "Render a visible focus indicator that is not color-only.",
    verification: "Check every interactive element on surface and muted backgrounds.",
  },
  {
    id: "reduced_motion",
    requirement: "Remove nonessential transitions when reduced motion is requested.",
    verification: "Emulate prefers-reduced-motion and confirm durations resolve to zero.",
  },
  {
    id: "named_removal_controls",
    requirement: "Give each context removal control a field-specific accessible name.",
    verification: "Confirm names such as Remove page and Remove application release.",
  },
];
