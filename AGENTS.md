# Filika Agent Guide

## Project

Filika is a WebMCP-enabled feedback application. A browser agent drafts a report
about a problem, complaint, blocked task, confusing behavior, or product idea
encountered on a website. The user reviews and confirms the report, the collector
stores it, and maintainers read it in the Filika workspace.

Nothing is transmitted before user confirmation. People can also submit feedback
manually when WebMCP is unavailable or they do not want to use an agent. Filika
provides the feedback workflow, not the AI assistant.

Repository areas:

- `apps/web`: host review UI and maintainer workspace.
- `packages/sdk`: browser SDK and public protocol.
- `packages/collector`: feedback API and PostgreSQL persistence.
- `tests/e2e`: browser-level integration tests.

## Working Rules

- Write all repository content in English.
- Use Bun 1.3.14. Do not introduce another package manager.
- Keep TypeScript strict and avoid `any`; validate data at trust boundaries.
- Keep changes focused on the requested behavior and preserve unrelated work.
- Add or update tests in the same pull request as behavior changes.
- Do not copy code, assets, prose, schemas, tests, or private history from
  another project without permission.
- Keep private plans, task identifiers, staffing notes, and agent session logs
  out of tracked files, commit messages, and pull request descriptions.
- Do not add accounts, billing, analytics, an AI provider, deployment config, or
  new external services unless the task explicitly requires them.

## WebMCP and Data Safety

- Use the current `document.modelContext` API.
- Keep tool names and descriptions static; never interpolate user-controlled
  content into tool metadata.
- Use closed input schemas and reject unknown fields.
- Bound tool input, output, network timeouts, and error messages.
- Treat browser, agent, and collector data as untrusted until validated.
- Do not collect page content, credentials, browsing history, screenshots, or
  other ambient data unless a later requirement explicitly adds it.
- Preserve user review before transmitting agent-authored feedback.
- Registration or execution failures must not break the host page.

## Required Verification

Run the checks relevant to the change before opening a pull request:

```sh
bun install
bun run check
bun run typecheck
bun run test:unit
bun run build
```

Run `bun run test:browser` when browser behavior or the end-to-end flow changes.

## Pull Requests

- Do not push directly to `main`; use a focused pull request.
- Use the repository pull request template and complete every applicable
  section.
- Use a title in the form `type(scope): imperative summary`, where `type` is
  `feat`, `fix`, `test`, `docs`, `refactor`, `ci`, or `chore`.
- Explain skipped checks and mark non-applicable template items explicitly.
- All required CI checks must pass before merge.

## Release Notes

- Start from `.github/release-notes-template.md`.
- Write for users and maintainers, not for the internal task plan.
- Do not include internal task IDs or implementation-only details.
- Link each notable change to its pull request when available.
- Put breaking changes and required upgrade actions first.
- Remove empty sections before publishing.
