# Filika

Filika is a WebMCP-enabled feedback system. A user's browser AI drafts a bug,
complaint, or product suggestion; the user reviews and confirms it; maintainers
receive it in their project workspace.

Filika never sends agent-authored feedback before explicit user confirmation and
does not provide an AI model. Manual feedback remains available without WebMCP.

## Flow

1. A site installs the Filika SDK and review UI.
2. The browser AI drafts structured feedback through WebMCP.
3. The user reviews, edits, confirms, or cancels it.
4. The collector validates and stores confirmed feedback.
5. Maintainers read it in the Filika workspace.

## Repository

- `packages/sdk`: browser SDK and WebMCP protocol.
- `packages/collector`: validation, API, and PostgreSQL persistence.
- `apps/web`: review UI and maintainer workspace.
- `tests/e2e`: browser integration tests.

## Local development

Requires Bun 1.3.14 and Docker Compose.

```sh
bun install
docker compose up db -d
cp .env.example .env
bun run db:migrate
bun run db:seed
bun run dev
```

Open [localhost:4173](http://localhost:4173).

## Verification

```sh
bun run check
bun run typecheck
bun run test:unit
bun run build
bun run test:browser
```

Use only dedicated disposable databases for unit and browser integration tests.

Filika is under active development and is not yet a hosted or published service.

## License

[Apache-2.0](LICENSE). Copyright 2026 Complaintr.
