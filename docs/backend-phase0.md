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

