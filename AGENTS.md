# Filika Agent Guide

## Project

Filika is a WebMCP-enabled feedback application. A browser agent drafts a report
about a problem, complaint, blocked task, confusing behavior, or product idea
encountered on a website. The collector stores it, and maintainers read it in
the Filika workspace.

Agent-authored feedback is transmitted without a user review step. People can
also submit feedback manually when WebMCP is unavailable or they do not want to
use an agent. Filika provides the feedback workflow, not the AI assistant.

Repository areas:

- `apps/web`: host review UI and maintainer workspace.
- `packages/sdk`: browser SDK and public protocol.
- `packages/collector`: feedback API and PostgreSQL persistence.
- `tests/e2e`: browser-level integration tests.

## Working Rules

- Write all repository content in English.
- Never use em dashes (`—`) in any repository content. Use a colon, a hyphen,
  or a restructured sentence instead.
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

## Onboarding

- Only the application name is required to create an application. The website
  origin is optional and can be added later in application settings.
- After onboarding, land on the application dashboard, not complaints.
- Use neutral example placeholders (such as "My Store"); do not present a real
  brand such as "Eckra" as an example.

## WebMCP and Data Safety

- Use the current `document.modelContext` API.
- Keep tool names and descriptions static; never interpolate user-controlled
  content into tool metadata.
- Use closed input schemas and reject unknown fields.
- Bound tool input, output, network timeouts, and error messages.
- Treat browser, agent, and collector data as untrusted until validated.
- Do not collect page content, credentials, browsing history, screenshots, or
  other ambient data unless a later requirement explicitly adds it.
- Transmit agent-authored feedback without a user review step.
- Registration or execution failures must not break the host page.

## Local Verification and CI

- During implementation, run the smallest relevant Bun test locally to protect
  code integrity and keep each logical change working. Prefer targeted commands
  such as `bun test path/to/relevant.test.ts` over the full test suite.
- Do not routinely reproduce the pull request CI matrix locally. GitHub Actions
  is responsible for install, lint and formatting, typecheck, unit, build, and
  browser verification after a pull request is opened or updated.
- Run a full CI command locally only when the user explicitly requests it or
  when diagnosing a failure reported by that CI job. Setup or build commands may
  still be run when they are required to implement the change itself.
- After opening or updating a pull request, inspect the required GitHub checks
  and fix any failures before merge.

## Pull Requests

- Open a pull request, push a branch, or inspect GitHub checks only when the
  user explicitly asks.
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
