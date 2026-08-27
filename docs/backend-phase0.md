# Filika Backend Phase 0 Design

This document collects the backend design drafts for the Filika Phase 0
foundation. Each section is a draft that later implementation phases consume:

- Section 1: threat model (`P0-BE-01`)
- Section 2: data lifecycle (`P0-BE-02`)
- Section 3: local PostgreSQL workflow (`P0-BE-03`)
- Section 4: collector request sequence (`P0-BE-04`)
- Section 5: server-derived and untrusted fields (`P0-BE-05`)
- Section 6: abuse-control test matrix (`P0-BE-06`)
- Section 7: WebMCP spike review record (`P0-BE-07`)

## Scope and assumptions

The collector is a public, unauthenticated HTTP endpoint. Anyone who knows the
collector URL and a valid project key can submit feedback. There is no account
system, no per-user identity, and no deployment target selected. Feedback is
retained for a 24-hour demo window and then removed. These assumptions shape
every control below and are revisited only through the documented contract
change process.

## 1. Threat model

This section drafts the threat model for public ingestion. For each threat
area it records the entry point, the impact, the mitigations the collector
design must include, and the verification tasks that will prove the control.

### 1.1 Assets

- **Project records**: public project key, allowed origin list, retention
  window, display name. Low sensitivity; still read-only to the public.
- **Feedback records**: agent-authored and user-reviewed report content plus
  server-derived request facts. User-controlled content, treated as untrusted
  until rendered as text.
- **Rate-limit identifiers**: keyed abuse-control records tied to projects and
  request fingerprints. Ephemeral, expire with feedback retention.
- **Logs**: structured operational records. Must never contain full report
  bodies, raw IP addresses, tokens, or unapproved headers.

### 1.2 Threat areas

| ID | Threat | Entry point | Impact | Likelihood | Mitigations | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| TH-01 | Public ingestion abuse | Any client POSTs to `POST /api/v1/feedback` | Disk fill, inbox noise, collector resource exhaustion | High | Bounded body size, closed envelope schema, strict size limits per field and total, project-level durable rate limit, 24-hour retention, rate-limit identifiers that expire | P2-BE-05, P2-BE-06, P2-BE-11, P2-BE-13 |
| TH-02 | Origin spoofing | Forged, missing, or `null` `Origin` header | Feedback attributed to the wrong host; bypass of origin policy | Medium | Origin is always derived from the request header, never from the body; missing/`null`/denied origins rejected before ingest; exact-match allowlist; `Vary: Origin` on responses | P2-BE-03, P2-BE-04, P4-BE-01, P4-BE-02 |
| TH-03 | Duplicate and replayed requests | Client retry or deliberate replay with the same event ID | Duplicate feedback records, inbox duplicates | Medium | One event UUID reused as `eventId` and `Idempotency-Key`; `Idempotency-Key` must equal `eventId`; unique `(project_id, event_id)` constraint; retry returns the original stored receipt with `duplicate: true` | P2-BE-07, P2-BE-09, P2-BE-10, P3-BE-04, P3-BE-06 |
| TH-04 | Stored XSS | Feedback content stored and later rendered in the maintainer inbox | Script execution in the maintainer's browser, credential loss | Medium | Inbox renders every value as text, never as markup; report content is marked untrusted; stored-XSS fixtures in tests; inbox route exposes no WebMCP tools | P4-FE-06, P4-FE-07, P4-BE-09 |
| TH-05 | Prompt injection | Malicious or hostile text inside agent-authored fields and optional context | Collector or agent misdirected by untrusted content | Medium | Tool name, title, description, and schema stay static and never interpolate user or host content; collector text is reconstructed into a safe receipt that cannot carry instructions to the agent; agent-authored fields are bounded and user-reviewed before transmission | P1-TL-05, P4-TL-02 |
| TH-06 | Payload abuse | Oversized, deeply nested, malformed, or invalid-UTF bodies | Parser resource exhaustion, validation bypass | High | Body size bound enforced before JSON parsing where the runtime permits; strict content type; closed Zod schema with maximum sizes per field and total envelope; malformed-JSON and invalid-UTF rejection paths | P2-BE-05, P2-BE-06, P4-BE-03, P4-BE-09 |
| TH-07 | Sensitive-data submission | Users or agents paste credentials, personal data, or secrets into report fields | Data exposure through inbox and logs | Medium | User reviews every outgoing field before transmission; collector never logs full report bodies; logs sanitize identifiers; 24-hour retention bounds exposure; privacy copy documents collected, optional, excluded, and retained data | P2-BE-14, P4-FE-08, P4-BE-06, P4-BE-07 |
| TH-08 | Rate-limit bypass | High-volume requests spread across event IDs or project keys | Abuse-control evasion, resource exhaustion | Medium | Atomic durable project-level rate limit; rate-limit identifiers expire and are cleaned with feedback retention; decisions are recorded in logs without request content | P2-BE-11, P2-BE-13, P4-BE-05 |

### 1.3 Trust boundary rules

- The collector never trusts a value supplied in the request body to describe
  origin, source, time, or identity.
- Any unknown field, extra list item beyond the bound, or oversized value is
  rejected wholesale; the collector does not silently truncate.
- Feedback content is untrusted data at every boundary: from the agent, from
  the host page, and from the collector back to the agent.
- Logs record validation outcomes, categories, and identifiers only.

### 1.4 Residual risk

- Origin is advisory because HTTP headers are settable by non-browser clients;
  origin matching protects browser flows and reduces attribution errors, not a
  cryptographic proof of host identity.
- Public ingestion remains open by design; the acceptable exposure is bounded
  by size limits, rate limits, and retention rather than by authentication.
- Stored-XSS protection depends on the inbox rendering every value as text and
  on regression fixtures staying in place.

## 2. Data lifecycle

This section drafts the lifecycle for every stored record: project records,
feedback records, rate-limit identifiers, and logs. It defines the states,
the retention window, and the cleanup contract that later phases implement.

### 2.1 Record types and states

**Project records** (`project`)

| Field intent | Ownership | Notes |
| --- | --- | --- |
| Public project key | Server-seeded | Human-readable key the SDK configures; not a secret |
| Allowed origins | Server-seeded | Exact-match allowlist for browser ingestion |
| Display name | Server-seeded | Shown in the dialog and inbox |
| Retention window | Server-seeded | 24 hours for the demo |

State machine: `seeded` → `active` → `retired`. Projects are seeded locally for
the challenge demo and have no public creation endpoint.

**Feedback records** (`feedback`)

State machine:

```
received (validated)
   │
   ▼
accepted (persisted) ──► read (listed/detailed in inbox)
   │                          │
   └────────── 24h ────────────┴──► expired ──► deleted (cleanup)
```

| State | Meaning | Transition |
| --- | --- | --- |
| `received` | Payload passed validation, before persistence | → `accepted` on successful transactional insert |
| `accepted` | Stored with unique `(project_id, event_id)` | → `duplicate` on idempotency hit; → `expired` after retention |
| `duplicate` | A retry matched an existing accepted record | Returns the original stored receipt; no new row |
| `read` | Exposed through read-only inbox queries | No write path from inbox |
| `expired` | Retention window elapsed | → `deleted` by the cleanup command |
| `deleted` | Removed by the cleanup command | Terminal |

**Rate-limit identifiers**

| Type | Purpose | Lifecycle |
| --- | --- | --- |
| Project counter | Bounded per-project submission volume | Atomic increment on ingest; windowed; durable |
| Request fingerprint | Keyed abuse identifier for a source without storing raw IP | Expires with feedback retention |

State machine: `active` → `expired` → `deleted`. Cleanup removes rate-limit
identifiers in the same pass as expired feedback so identifiers never outlive
the retention window they bound.

**Logs**

- Structured records of validation outcomes, error categories, and request
  identifiers.
- Never contain full report bodies, raw IP addresses, tokens, or unapproved
  headers.
- No long-term retention requirement beyond the operational window; they are
  not treated as a data store.

### 2.2 Retention policy

- Demo feedback is retained for **24 hours** from acceptance, then removed.
- The cleanup command is repeatable and idempotent; it deletes only feedback
  that has exceeded the retention window and never touches active records.
- Rate-limit identifiers expire on the same schedule so they cannot be used to
  correlate activity beyond the retention window.

### 2.3 Cleanup contract

- `db:cleanup` removes expired feedback and expired rate-limit identifiers in
  one transactional pass.
- Running cleanup twice is harmless; the second run deletes nothing new.
- Cleanup must not delete non-expired feedback, and must not delete projects.

### 2.4 Deletion semantics

- Deletion is a hard delete. The demo has no backup requirement; the data
  lifecycle is a bounded, ephemeral sink by design.

### 2.5 Design notes

- The `project` table is a stable anchor; feedback, rate limits, and logs all
  reference it through the opaque internal project ID, which the inbox never
  exposes.
- The lifecycle intentionally provides no update or delete path from the
  public interface; the inbox is strictly read-only.

## 3. Local PostgreSQL workflow

This section defines the local PostgreSQL workflow: the databases used, the
test-isolation strategy, and the command names that later phases implement. It
defines the contract only; the actual Drizzle schema, migration files, and
commands belong to the Phase 2 collector work.

### 3.1 Databases

| Database | Purpose | Mutated by |
| --- | --- | --- |
| `filika` | Local development data for the demo and inbox | Migrations, seed, cleanup, application writes |
| `filika_test` | Isolated test database | Tests only |

The test database never overlaps with development data. Tests create or reset
`filika_test`, apply migrations, and seed it as needed; they never read or
write `filika`.

### 3.2 Planned commands

| Command | Behavior |
| --- | --- |
| `bun run db:migrate` | Apply pending migrations to the configured database |
| `bun run db:seed` | Seed the challenge demo project, its allowed localhost origins, and the retention window |
| `bun run db:cleanup` | Remove expired feedback and expired rate-limit identifiers in one pass |
| `bun run db:reset` | Drop and recreate the schema, then migrate and seed, for deterministic repeated runs |

Commands resolve the target database from local configuration only. Migration
and seed commands default to `filika`; test tooling sets `filika_test`.

### 3.3 Migration rules

- Migrations are versioned, ordered, append-only files.
- An applied migration is never edited; corrections are new migrations.
- Migrations apply cleanly to an empty database and produce the expected
  constraints, including the unique `(project_id, event_id)` index.
- `db:reset` exists for deterministic browser and API test runs and is the
  documented reset path; there is no backup workflow.

### 3.4 Configuration

- Database connection is configured through local environment placeholders
  only, with no provider-specific secrets or credentials committed.
- The default local endpoint and port are documented in the local development
  guide; origin matching covers the documented development ports.

### 3.5 Test isolation flow

```
bun run db:reset --db filika_test   # deterministic baseline
# run API/browser tests against filika_test
bun run db:cleanup --db filika_test # verify idempotent cleanup in tests
```

Tests assert on `filika_test` state after every scenario (accepted, rejected,
duplicate, rate-limited) and never depend on residue from a previous run.

## 4. Collector request sequence

This section drafts the end-to-end request sequence for
`POST /api/v1/feedback`, from the CORS preflight through validation,
persistence, duplicate resolution, and receipt generation. Error categories
map to the frozen SDK outcome contract so the dialog can react deterministically.

### 4.1 Sequence

```
Browser SDK                        Collector (server)                 PostgreSQL
    |  OPTIONS /api/v1/feedback       |                                  |
    |  Origin: https://host.example   |                                  |
    |-------------------------------->| 1. Preflight: validate Origin,    |
    |                                 |    allowed methods and headers;   |
    |                                 |    respond with exact allow-origin |
    |                                 |    and Vary: Origin               |
    |  Access-Control-Allow-*         |                                  |
    |<--------------------------------|                                  |
    |  POST /api/v1/feedback          |                                  |
    |  Origin, Content-Type:          |                                  |
    |    application/json,            |                                  |
    |  Idempotency-Key: <eventId>     |                                  |
    |-------------------------------->| 2. Read Origin header            |
    |                                 | 3. Reject missing/null/denied     |
    |                                 |    origin before ingest          |
    |                                 | 4. Enforce body-size bound       |
    |                                 |    before parsing                |
    |                                 | 5. Enforce strict content type   |
    |                                 | 6. Parse JSON in a bounded way   |
    |                                 | 7. Require Idempotency-Key to    |
    |                                 |    equal eventId                 |
    |                                 | 8. Validate V1 envelope (Zod):   |
    |                                 |    sizes, required fields,       |
    |                                 |    unknown-field rejection       |
    |                                 | 9. Resolve project by key        |
    |                                 |10. Atomic durable rate-limit     |
    |                                 |    check                         |
    |                                 |11. Transactional insert with     |
    |                                 |    unique (project_id, event_id) |
    |                                 |   ├─ new row: committed          |
    |                                 |   └─ unique violation: fetch the |
    |                                 |      stored receipt, mark        |
    |                                 |      duplicate                   |
    |                                 |12. Build receipt from            |
    |                                 |    server-derived fields only    |
    |  HTTP 201 / 200 + receipt       |                                  |
    |<--------------------------------|                                  |
```

### 4.2 Response contract

| Outcome | HTTP status | Body |
| --- | --- | --- |
| Accepted | `201 Created` | Receipt with server-derived fields |
| Duplicate retry | `200 OK` | Original stored receipt with `duplicate: true` |
| Invalid input | `400 Bad Request` | Error category + bounded message |
| Denied/missing origin | `403 Forbidden` | Error category + bounded message |
| Payload too large | `413 Content Too Large` | Error category |
| Project not found | `400 Bad Request` | Error category + bounded message |
| Internal error | `500 Internal Server Error` | Generic bounded message |

Responses never echo the submitted report body and never include internal
identifiers, rate-limit details, or collector-internal messages.

### 4.3 Error categories to SDK outcomes

| Collector error category | SDK outcome |
| --- | --- |
| `invalid_input` | `invalid_input` |
| `denied_origin` | `collector_rejection` |
| `payload_too_large` | `collector_rejection` |
| `project_not_found` | `collector_rejection` |
| `internal_error` | `internal_error` |
| duplicate retry | `success` with `duplicate: true` |

The mapping keeps the SDK contract frozen and lets the dialog render a bounded,
user-safe failure message without exposing collector internals.

### 4.4 Design notes

- Origin is consumed from the request header only and is validated before any
  body work; a denied request is rejected with no persistence attempt.
- Idempotency and persistence are one transaction: the unique
  `(project_id, event_id)` constraint is the source of truth for duplicates.
- Every rejection and acceptance is logged as a bounded, sanitized record
  (validation outcome, category, identifiers only).

## 5. Server-derived and untrusted fields

This section lists which fields the collector derives server-side and which
fields arrive from the client and must remain untrusted. The distinction is the
backbone of the trust boundary: client values are validated, bounded, and
stored as data, but never used to describe origin, source, time, or identity.

### 5.1 Server-derived fields

| Field | Derivation | Notes |
| --- | --- | --- |
| Request origin | From the validated `Origin` request header | Never taken from the body; the basis of origin policy |
| Source | Fixed value `web_sdk_unverified` | Marks that the report was not authenticated; not client-settable |
| Feedback ID | Server-generated UUID | Issued at persistence time |
| Receipt timestamp | Server clock at acceptance | Also used as the retention anchor |
| Project identity | Resolved from the project key lookup | Internal ID never exposed to the public API or inbox |
| Rate-limit decision | Server-side counter check | Applied before persistence |
| Retention window | From the resolved project record | Shown in the dialog and privacy copy |

### 5.2 Client-supplied fields treated as untrusted data

| Field | Validation | Why it stays untrusted |
| --- | --- | --- |
| `projectKey` | Format bound; used only to resolve the project | Not a credential; public lookup key |
| `eventId` | UUID format; must equal `Idempotency-Key` | Opaque idempotency key; uniqueness enforced by the constraint, not by trust in the client |
| `kind` | Bounded enum | Agent-authored |
| `title` | Bounded length | Agent-authored |
| `description` | Bounded length | Agent-authored |
| `expectedBehavior` | Bounded length | Agent-authored |
| `reproductionSteps` | Bounded length | Agent-authored |
| Optional context items | Bounded list, bounded item length, closed shape | Host-supplied and agent-supplied |
| `routeLabel`, `applicationRelease` | Static, bounded strings | Optional host configuration, used as display metadata only |

### 5.3 Client claims that are rejected or ignored

- Any body field claiming origin, source, timestamp, identity, or role is
  rejected by the closed schema; unknown fields fail validation wholesale.
- No client value is ever echoed back as an instruction or interpolated into
  tool metadata, error text, or receipt fields.
- The receipt is reconstructed exclusively from server-derived fields; client
  text that would be passed toward the agent is revalidated under the
  receipt-construction rules so collector text cannot become agent input.

## 6. Abuse-control test matrix

This section defines the first abuse-control test matrix. It fixes the expected
behavior for the six baseline scenarios; later phases turn each row into an
automated API and database test and extend the matrix.

Columns: scenario, request characteristics, expected HTTP status, error
category, log behavior, and expected database state.

| # | Scenario | Request characteristics | HTTP status | Error category | Log behavior | DB state |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Missing origin | `POST /api/v1/feedback` with no `Origin` header | `403` | `denied_origin` | Outcome + category, no body content | No row written |
| 2 | `null` origin | `Origin: null` | `403` | `denied_origin` | Outcome + category, no body content | No row written |
| 3 | Denied origin | `Origin` from a host not on the project allowlist | `403` | `denied_origin` | Outcome + category, origin role only | No row written |
| 4 | Oversized body | Body over the documented bound (including a bound+1 case) | `413` | `payload_too_large` | Rejection before parse; size category only | No row written |
| 5 | Invalid project key | Well-formed request with an unknown or malformed `projectKey` | `400` | `project_not_found` | Outcome + category, no body content | No row written |
| 6 | Repeated event ID | Same `eventId` and `Idempotency-Key` resubmitted after an accepted row | `200` | (duplicate) | Outcome + identifiers only | Original row unchanged; no second row |

### 6.1 Cross-cutting assertions

- Every rejected scenario produces a bounded response and never echoes report
  content back to the client.
- Logs for every scenario contain no full report body, raw IP, token, or
  unapproved header.
- The `null` and missing-origin rows confirm rejection happens before any
  parsing or persistence work.
- The oversized-body row must hold even when the runtime would otherwise accept
  the request, confirming the bound is enforced before JSON parsing.
- The repeated-event-ID row confirms idempotency is atomic under the unique
  constraint and that the duplicate receipt carries the original server-derived
  values and `duplicate: true`.

### 6.2 Follow-up scope

The matrix expands in later phases with malformed JSON, invalid UTF, unknown
fields, per-field and total-size limits, concurrency, and preflight variants
without changing the frozen protocol.

## 7. WebMCP spike review record

This section records the review of the localhost WebMCP spike for unwanted data
collection and network behavior. The spike exists to prove local registration
and inspection of a harmless test tool; it is not the SDK and must not be
confused with the future `filika_submit_feedback` tool.

### 7.1 Scope reviewed

| File | Role |
| --- | --- |
| `apps/web/src/webmcp-test-tool.ts` | Defines the test tool, its closed empty schema, and its execute behavior |
| `apps/web/src/index.ts` | Registers the tool and renders bounded registration status |
| `apps/web/src/index.html` | Host page shell with a bounded status line and invocation counter |
| `docs/webmcp-local-testing.md` | Documents local inspection steps |

### 7.2 Findings

| Check | Result | Evidence |
| --- | --- | --- |
| Page data collection | None | The tool has an empty input schema (`properties: {}`, `additionalProperties: false`) and reads no page content; the page script reads only its own status/counter elements |
| Network behavior | None | `execute` returns a static string and makes no network requests; registration and abort use only in-page signals |
| Credentials or ambient access | None | No cookies, storage, clipboard, or credential APIs are touched; the page sets `referrer no-referrer` |
| Bounded failures | Pass | Unsupported and registration-failure paths render bounded messages and keep the host page usable |
| Unintended persistence | None | No state is written anywhere beyond the in-page counter |

### 7.3 Conclusion

No unwanted data collection or network behavior was found in the localhost
spike. The spike is safe to keep as a local inspection page.

### 7.4 Follow-ups

- The spike tool must remain separate from the SDK tool and must not be
  exported or bundled into `packages/sdk`.
- When the SDK tool is implemented, re-run this review against the SDK
  registration path with the WebMCP Inspector as a separate verification path.
- No code changes are required in this phase.

