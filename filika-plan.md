# Filika Implementation Checklist

**Date:** 2026-08-26

## Phase 0: Alignment and Clean-Room Foundation

### Team Lead Tasks

- [x] `P0-TL-01` Create the fresh repository structure with `apps/web`, `packages/sdk`, and `tests/e2e`.
- [x] `P0-TL-02` Configure Bun workspaces, strict TypeScript, shared path rules, and reproducible install commands.
- [x] `P0-TL-03` Configure Biome for formatting, linting, and import organization.
- [x] `P0-TL-04` Add CI skeleton jobs for install, typecheck, lint, unit tests, build, and a placeholder browser test.
- [x] `P0-TL-07` Implement a minimal localhost WebMCP spike that registers a harmless test tool and can be inspected in supported Chrome testing mode.
- [x] `P0-TL-08` Document exact local browser flags and inspection steps without adding any deployment dependency.

### Frontend-Leaning Full-Stack Tasks

- [ ] `P0-FE-01` Map the complete user journey from agent failure to report review, confirmation, receipt, and maintainer inbox.
- [ ] `P0-FE-02` Define every UI state: idle, unsupported browser, report review, invalid input, submitting, success, duplicate, canceled, timeout, and outcome unknown.
- [ ] `P0-FE-03` Produce low-fidelity layouts for the sample application, feedback dialog, receipt, inbox list, and inbox detail.
- [ ] `P0-FE-04` Define original Filika design tokens for color, typography, spacing, focus, and motion. Do not derive them from Complaintr.
- [ ] `P0-FE-05` Define the accessibility checklist for native dialog behavior, focus return, keyboard navigation, validation messages, and reduced motion.
- [ ] `P0-FE-06` Specify the deterministic sample failure and its visible before, failure, and reset states.
- [ ] `P0-FE-07` Prototype CSS isolation using Shadow DOM or an equivalently robust boundary and record the chosen approach.

### Backend Engineer Tasks

- [x] `P0-BE-01` Draft the threat model for public ingestion, origin spoofing, duplicate requests, XSS, prompt injection, payload abuse, and sensitive-data submission.
- [x] `P0-BE-02` Draft the data lifecycle for project records, feedback records, rate-limit identifiers, logs, and 24-hour demo retention.
- [x] `P0-BE-03` Define the local PostgreSQL workflow, test database isolation, migration command, seed command, and cleanup command.
- [x] `P0-BE-04` Draft the collector request sequence from CORS preflight through validation, persistence, duplicate resolution, and receipt generation.
- [x] `P0-BE-05` List all server-derived fields and all client fields that must remain untrusted.
- [x] `P0-BE-06` Define the first abuse-control test matrix, including missing origin, `null` origin, denied origin, oversized body, invalid key, and repeated event ID.
- [x] `P0-BE-07` Review the localhost WebMCP spike for unwanted data collection and network behavior.

## Phase 1: Contracts and Technical Skeleton

### Team Lead Tasks

- [ ] `P1-TL-01` Define `FilikaFeedbackEnvelopeV1` with exact field names, maximum sizes, required fields, and unknown-field rejection.
- [ ] `P1-TL-02` Define the static `filika_submit_feedback` tool name, title, description, JSON Schema, and WebMCP annotations.
- [ ] `P1-TL-03` Define the public SDK configuration contract for `projectKey`, HTTPS `endpoint`, optional static `routeLabel`, and optional static `applicationRelease`.
- [ ] `P1-TL-04` Define the closed execution outcome codes for success, invalid input, cancellation, timeout, abort, collector rejection, internal error, and outcome unknown.
- [ ] `P1-TL-05` Define the validated receipt shape and rules that prevent collector text from passing directly to the agent.
- [ ] `P1-TL-06` Define SDK lifecycle behavior for initialization, duplicate initialization, registration, disposal, unsupported browsers, and registration rejection.
- [ ] `P1-TL-07` Configure esbuild to produce one classic IIFE browser bundle with the global `Filika` API.
- [ ] `P1-TL-08` Add contract snapshot tests for the tool schema, envelope schema, receipt shape, and outcome codes.

### Frontend-Leaning Full-Stack Tasks

- [ ] `P1-FE-01` Convert the dialog wireframe into a state machine that covers every SDK execution outcome.
- [ ] `P1-FE-02` Define which fields are editable, clearable, removable, required for submission, and displayed in the receipt.
- [ ] `P1-FE-03` Define the native `<dialog>` markup, focus order, accessible names, descriptions, errors, and live-region behavior.
- [ ] `P1-FE-04` Define the default manual feedback button and `Filika.open()` interaction contract.
- [ ] `P1-FE-05` Define the inbox list and detail view models using only fields approved in the public protocol and server-derived request facts.
- [ ] `P1-FE-06` Define empty, loading, not-found, error, and expired-feedback UI states.
- [ ] `P1-FE-07` Review the tool schema and report fields for clarity from the user's perspective.

### Backend Engineer Tasks

- [ ] `P1-BE-01` Implement the server-side Zod schema for the complete V1 envelope with unknown fields rejected.
- [ ] `P1-BE-02` Define Drizzle tables for `project`, `feedback`, and durable rate-limit records.
- [ ] `P1-BE-03` Define the unique `(project_id, event_id)` constraint and the exact duplicate-receipt behavior.
- [ ] `P1-BE-04` Define the `POST /api/v1/feedback` request, response, CORS, error-category, and body-size contract.
- [ ] `P1-BE-05` Define read-only inbox query contracts for list and detail views.
- [ ] `P1-BE-06` Define server-owned values for request origin, `web_sdk_unverified` source, feedback ID, and receipt timestamp.
- [ ] `P1-BE-07` Define the retention cleanup command and atomic project-rate-limit behavior.
- [ ] `P1-BE-08` Review the SDK contract for origin, idempotency, retry, and privacy correctness.

## Phase 2: Parallel Component Implementation

### Team Lead Track: WebMCP SDK Core

- [ ] `P2-TL-01` Implement auto-initialization from the SDK script's fixed data attributes.
- [ ] `P2-TL-02` Validate configuration, allow localhost during development, and require HTTPS collector endpoints for production builds.
- [ ] `P2-TL-03` Implement WebMCP feature detection and bounded unsupported-browser status.
- [ ] `P2-TL-04` Implement tool registration with exact schema and annotations.
- [ ] `P2-TL-05` Handle `InvalidStateError`, `SecurityError`, `NotAllowedError`, and unknown registration failures without breaking the host page.
- [ ] `P2-TL-06` Implement duplicate-load protection, `AbortController` lifecycle, and `dispose()`.
- [ ] `P2-TL-07` Build the minimal context object from SDK version and optional static host configuration only.
- [ ] `P2-TL-08` Generate one event UUID and reuse it as both `eventId` and `Idempotency-Key`.
- [ ] `P2-TL-09` Forward execution abort signals through review and network operations.
- [ ] `P2-TL-10` Implement the HTTP request with `credentials: "omit"`, strict content type, and bounded timeout behavior.
- [ ] `P2-TL-11` Validate the collector response and reconstruct a safe receipt from closed primitives.
- [ ] `P2-TL-12` Preserve the event UUID for explicit outcome-unknown retry.
- [ ] `P2-TL-13` Expose `Filika.open()`, initialization status, and disposal through the public global API.
- [ ] `P2-TL-14` Produce the minified IIFE bundle and deterministic build metadata needed to calculate SRI later, without publishing or deploying it.
- [ ] `P2-TL-15` Add SDK unit tests for registration, input validation, lifecycle, abort, timeout, retry, and receipt reconstruction.

### Frontend-Leaning Full-Stack Track: Dialog, Demo, and Inbox

- [ ] `P2-FE-01` Implement the SDK's native review dialog inside the approved style-isolation boundary.
- [ ] `P2-FE-02` Render editable kind, title, description, expected behavior, and reproduction steps.
- [ ] `P2-FE-03` Allow every agent-authored field to be edited or cleared, while blocking submission until required fields are valid.
- [ ] `P2-FE-04` Render optional context as removable items separate from agent-authored report content.
- [ ] `P2-FE-05` Show project identity, collector origin, retention summary, and privacy link before confirmation.
- [ ] `P2-FE-06` Implement cancel, timeout, abort, submitting, success, duplicate, collector rejection, and outcome-unknown states.
- [ ] `P2-FE-07` Implement the default manual feedback button and `Filika.open()` flow using the same dialog.
- [ ] `P2-FE-08` Implement focus restoration, keyboard interaction, visible focus, accessible validation messages, and reduced-motion behavior.
- [ ] `P2-FE-09` Build the sample application with a normal task and one deterministic, resettable failure.
- [ ] `P2-FE-10` Add the sample application's own WebMCP task tool that produces the visible deterministic failure.
- [ ] `P2-FE-11` Build the public read-only maintainer inbox list.
- [ ] `P2-FE-12` Build the inbox detail view with clear separation between agent-authored, host-supplied, and server-derived fields.
- [ ] `P2-FE-13` Implement empty, loading, error, not-found, and expired states.
- [ ] `P2-FE-14` Add component and interaction tests for dialog and inbox states.

### Backend Engineer Track: Collector and Persistence

- [ ] `P2-BE-01` Implement Drizzle schema and migration files for project, feedback, and rate-limit records.
- [ ] `P2-BE-02` Implement local seed data for one challenge demo project and allowed localhost origins.
- [ ] `P2-BE-03` Implement CORS preflight with exact allowed origin, methods, headers, and `Vary: Origin` behavior.
- [ ] `P2-BE-04` Reject missing, `null`, malformed, and denied origins before ingest.
- [ ] `P2-BE-05` Reject oversized bodies before JSON parsing where the runtime permits it.
- [ ] `P2-BE-06` Validate project key, schema version, body fields, maximum sizes, and unknown-field rejection.
- [ ] `P2-BE-07` Require `Idempotency-Key` to equal `eventId`.
- [ ] `P2-BE-08` Derive request origin, source, feedback ID, and receipt time server-side.
- [ ] `P2-BE-09` Implement transactional persistence and the unique event constraint.
- [ ] `P2-BE-10` Return the original receipt with `duplicate: true` for an accepted retry.
- [ ] `P2-BE-11` Implement an atomic durable project-rate limit and an interface for later trusted client-address resolution.
- [ ] `P2-BE-12` Implement read-only inbox list and detail queries with bounded pagination.
- [ ] `P2-BE-13` Implement the 24-hour demo feedback cleanup command and expiring abuse identifiers.
- [ ] `P2-BE-14` Add structured logs that record validation outcomes without full report bodies or raw IP addresses.
- [ ] `P2-BE-15` Add API and database tests for accepted, rejected, duplicate, rate-limited, and cleanup behavior.

## Phase 3: End-to-End Integration

### Team Lead Tasks

- [ ] `P3-TL-01` Integrate the built SDK asset into the local sample application without bypassing the public script contract.
- [ ] `P3-TL-02` Configure the local script attributes for project key, local collector endpoint, route label, and application release.
- [ ] `P3-TL-03` Connect tool invocation to the FE dialog module and BE collector contract.
- [ ] `P3-TL-04` Resolve build, serialization, abort, and retry mismatches without widening the frozen protocol.
- [ ] `P3-TL-05` Add the first Playwright vertical-slice test using a small `document.modelContext` test double.
- [ ] `P3-TL-06` Add CI execution for local database migration, seed, vertical-slice test, and cleanup.
- [ ] `P3-TL-07` Document the exact localhost demo command and expected journey.

### Frontend-Leaning Full-Stack Tasks

- [ ] `P3-FE-01` Embed the real SDK bundle into the sample application using the documented script contract.
- [ ] `P3-FE-02` Verify that the sample failure naturally exposes a reason for the agent to choose the Filika tool.
- [ ] `P3-FE-03` Connect success and duplicate receipts to visible page feedback without echoing the submitted report.
- [ ] `P3-FE-04` Connect inbox list and detail pages to the BE read APIs.
- [ ] `P3-FE-05` Ensure the newly submitted feedback can be located deterministically in the demo inbox.
- [ ] `P3-FE-06` Add Playwright assertions for edit, remove-context, confirm, cancel, retry, and manual-button flows.
- [ ] `P3-FE-07` Verify the dialog remains usable when the host page has aggressive global CSS.

### Backend Engineer Tasks

- [ ] `P3-BE-01` Apply migrations and seed the local demo project for the integrated flow.
- [ ] `P3-BE-02` Verify local origin matching for the documented development ports.
- [ ] `P3-BE-03` Map collector rejection categories to the frozen SDK outcome contract.
- [ ] `P3-BE-04` Ensure duplicate retry returns the same feedback ID and original receipt timestamp.
- [ ] `P3-BE-05` Ensure inbox queries expose no internal project ID, rate-limit identifier, or unapproved context.
- [ ] `P3-BE-06` Add concurrency tests for simultaneous first submission and duplicate retry.
- [ ] `P3-BE-07` Add deterministic database reset and seed commands for repeated browser tests.

## Phase 4: Security, Privacy, Accessibility, and Reliability

### Team Lead Tasks

- [ ] `P4-TL-01` Verify that tool name, description, schema, and annotations exactly match the frozen contract.
- [ ] `P4-TL-02` Verify no customer-controlled text enters tool descriptions or agent-facing receipt output.
- [ ] `P4-TL-03` Verify all registration, execution, and network abort signals terminate cleanly.
- [ ] `P4-TL-04` Add tests for `Permissions-Policy: tools=()` and all bounded registration diagnostics.
- [ ] `P4-TL-05` Add deterministic bundle hashing and SRI generation to the build output, without configuring a CDN or host.
- [ ] `P4-TL-06` Audit SDK runtime dependencies and remove any dependency unnecessary for the browser bundle.
- [ ] `P4-TL-07` Run a clean-room provenance review across source, documentation, assets, and package metadata.
- [ ] `P4-TL-08` Coordinate the cross-team security review and own remediation tracking.

### Frontend-Leaning Full-Stack Tasks

- [ ] `P4-FE-01` Run keyboard-only verification for open, edit, context removal, validation, cancel, submit, retry, and focus return.
- [ ] `P4-FE-02` Verify native dialog labels, descriptions, error association, and live-region announcements with a screen reader.
- [ ] `P4-FE-03` Verify visible focus and contrast in every UI state.
- [ ] `P4-FE-04` Verify reduced-motion behavior and prevent background interaction while the modal is open.
- [ ] `P4-FE-05` Confirm every outgoing field is visible and editable or removable before submission.
- [ ] `P4-FE-06` Render all inbox values as text and add stored-XSS regression fixtures.
- [ ] `P4-FE-07` Mark inbox report content as untrusted data and ensure the inbox route exposes no WebMCP tools.
- [ ] `P4-FE-08` Verify privacy copy accurately lists collected, optional, excluded, and retained data.
- [ ] `P4-FE-09` Test SDK style isolation against a hostile host-page fixture.

### Backend Engineer Tasks

- [ ] `P4-BE-01` Complete the origin matrix for exact match, scheme mismatch, port mismatch, subdomain mismatch, missing origin, and `null` origin.
- [ ] `P4-BE-02` Complete preflight and allowed-header tests.
- [ ] `P4-BE-03` Complete body, field, list, and total-envelope size-limit tests.
- [ ] `P4-BE-04` Verify all body-supplied origin, source, time, and identity claims are rejected or ignored.
- [ ] `P4-BE-05` Verify atomic idempotency and rate-limit behavior under concurrent requests.
- [ ] `P4-BE-06` Verify logs contain no full report body, raw IP, token, or unapproved header.
- [ ] `P4-BE-07` Verify feedback, logs, and keyed abuse identifiers expire according to the documented policy.
- [ ] `P4-BE-08` Make trusted client-address resolution a clearly documented deployment adapter. Do not select or configure a provider.
- [ ] `P4-BE-09` Run stored-XSS, prompt-injection-content, invalid-UTF, and malformed-JSON tests.
- [ ] `P4-BE-10` Review SDK request construction and dialog privacy behavior.

## Phase 5: Verification and WebMCP Evals

### Team Lead Tasks

- [ ] `P5-TL-01` Run clean install, typecheck, lint, unit, API, build, and end-to-end commands from a fresh local clone.
- [ ] `P5-TL-02` Validate the real tool from local Chrome using the documented WebMCP testing controls and DevTools panel.
- [ ] `P5-TL-03` Validate registration, invocation, cancellation, and disposal with the WebMCP Inspector as a separate path.
- [ ] `P5-TL-04` Define positive eval prompts for an observed bug, blocked task, confusing behavior, and concrete idea.
- [ ] `P5-TL-05` Define negative eval prompts for unrelated requests, hypothetical problems, insufficient evidence, duplicates, and sensitive-data requests.
- [ ] `P5-TL-06` Record tool-selection success, argument quality, unnecessary invocation, and full-journey completion.
- [ ] `P5-TL-07` Refine tool metadata only when supported by eval evidence and approved under the contract-change rule.
- [ ] `P5-TL-08` Prepare the exact ChatGPT Site Tools test script for the later post-deployment workstream. Do not execute deployment or introduce a tunnel.

### Frontend-Leaning Full-Stack Tasks

- [ ] `P5-FE-01` Expand Playwright coverage for all user-visible success and failure states.
- [ ] `P5-FE-02` Run a final accessibility pass across demo, dialog, receipt, inbox list, and inbox detail.
- [ ] `P5-FE-03` Verify the normal manual feedback path remains complete when WebMCP is unavailable.
- [ ] `P5-FE-04` Test the SDK and dialog against at least two hostile CSS fixtures.
- [ ] `P5-FE-05` Verify that long but valid content remains readable and that truncation occurs only where documented.
- [ ] `P5-FE-06` Rehearse the complete local demo flow and record every manual step needed for a later video.
- [ ] `P5-FE-07` Prepare screenshot and video shot lists without recording provider-specific deployment screens.

### Backend Engineer Tasks

- [ ] `P5-BE-01` Run the full collector contract test matrix against a fresh test database.
- [ ] `P5-BE-02` Run concurrency tests for idempotency, project limits, and cleanup.
- [ ] `P5-BE-03` Inject database unavailability and unexpected errors, then verify bounded responses and safe logs.
- [ ] `P5-BE-04` Verify list and detail queries remain bounded with large fixture sets.
- [ ] `P5-BE-05` Verify cleanup is repeatable, idempotent, and does not delete non-expired feedback.
- [ ] `P5-BE-06` Verify all migrations apply to an empty database and produce the expected constraints.
- [ ] `P5-BE-07` Produce a concise backend evidence report linking each security control to its test.

## Phase 6: Release Candidate

### Team Lead Tasks

- [ ] `P6-TL-01` Finalize the English README with product thesis, local quickstart, two-line integration, demo journey, and test commands.
- [ ] `P6-TL-03` Finalize `docs/challenge.md` with WebMCP fit, Chrome verification, eval method, and known limitations.
- [ ] `P6-TL-04` Verify the Apache-2.0 license and package metadata.
- [ ] `P6-TL-05` Run the final clean-room provenance review and dependency-license audit.
- [ ] `P6-TL-06` Run the complete release-candidate command sequence from a clean clone.
- [ ] `P6-TL-07` Freeze the V1 protocol and create a release-candidate manifest containing source revision, checksums, SRI value, migration set, and test results.

### Frontend-Leaning Full-Stack Tasks

- [ ] `P6-FE-01` Finalize the integration guide with the immutable script example and manual fallback API.
- [ ] `P6-FE-02` Finalize privacy-facing copy and document every dialog field.
- [ ] `P6-FE-03` Finalize accessibility notes and manual verification steps.
- [ ] `P6-FE-04` Prepare approved screenshots of the local demo, dialog, receipt, and inbox using synthetic data only.
- [ ] `P6-FE-05` Prepare the under-three-minute demo storyboard and local recording rehearsal script.
- [ ] `P6-FE-06` Verify all empty, error, loading, expired, and unsupported-browser states are documented.
- [ ] `P6-FE-07` Complete a final visual and interaction regression pass on the release candidate.

### Backend Engineer Tasks

- [ ] `P6-BE-01` Finalize the collector API reference with request, headers, response, error categories, and limits.
- [ ] `P6-BE-02` Finalize database schema and migration documentation.
- [ ] `P6-BE-03` Finalize retention, abuse prevention, logging, and deletion documentation.
- [ ] `P6-BE-04` Finalize `.env.example` with local-only placeholders and no provider-specific secrets.
- [ ] `P6-BE-05` Document local migration, seed, cleanup, reset, and backup-free demo workflows.
