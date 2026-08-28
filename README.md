# Filika

Filika lets browser agents turn problems they encounter on a website into feedback
for its maintainers. The agent prepares a report through WebMCP, the user reviews
and approves it, and the maintainer reads it in an inbox.

Nothing is sent until the user confirms. Users can also write feedback themselves,
without an agent or WebMCP support.

This repository contains the browser SDK, feedback dialog, collector API, and a
management workspace. It runs locally; there is no hosted service or published package.

## Getting started

You need **Bun 1.3.14** and **Docker with Compose**.
Run all commands from the repository root.

### 1. Install dependencies and start PostgreSQL

```sh
bun install
docker compose up db -d
```

This starts PostgreSQL 16 on `localhost:55432` and stores data in a Docker volume.
Run `docker compose ps db` and wait for the status to show **healthy** before
continuing. The database credentials are for local development only.

### 2. Configure and start the API

Create your local environment file from the example:

```sh
cp .env.example .env
```

Bun loads `.env` automatically, so the commands below need no exports. If your
database URL differs, edit `.env` first.

```sh
bun run db:migrate
bun run db:seed
bun run dev:collector
```

Leave this terminal running. The API listens on port **8787**.

### 3. Start the workspace

In a second terminal:

```sh
bun run dev
```

Open [localhost:4173](http://localhost:4173). Restart this command after source
changes; the development server does not hot reload.

## Your workspace

The home page is **Dashboard**, with complaint totals, daily activity, feedback
types, the latest reports, and the most reported page labels. Choose a 7-, 30-, or
90-day UTC calendar window. Summaries are computed in PostgreSQL across the whole
window, independently of the complaint list's pagination.

**All complaints** provides server-side search across titles, page labels, and
request origins, a feedback-type filter, cursor pagination, and read-only report
details. Filters are reflected in the URL. Direct links to `/dashboard`,
`/complaints`, `/complaints/:feedbackId`, and `/settings` work after a refresh.

**Settings** saves a workspace display name, default dashboard range, and table
density in this browser's local storage. These preferences do not change collector
projects, retention rules, or other browsers. The page also checks the collector
connection and explains data boundaries.

The web server forwards only the workspace's read endpoints to
`FILIKA_COLLECTOR_ORIGIN` (default `http://localhost:8787`). Set this value in `.env`
and restart the web server if your collector runs elsewhere. It must be an HTTP(S)
origin, without credentials or a path. Browser requests stay on the web origin;
no collector address is taken from report content or browser storage.

The demo page is no longer mounted. The workspace never loads or registers the
feedback SDK or WebMCP tools. The SDK and its user-review dialog remain available
for integration into host websites; the development SDK bundle is still served at
`/sdk/filika.development.js`. Legacy sample modules and test fixtures remain for
SDK compatibility, but they are not part of the workspace entry point.

Reports are publicly readable; this is not an authenticated, per-user workspace.
Keep the collector on a trusted network and do not submit credentials or personal
information. Retention is configured per project (24 hours for the local seed).
Expired records remain in lists and aggregate counts until `bun run db:cleanup`
removes them; their detail view displays an expiration notice.

To stop, press `Ctrl+C` in both terminals and run `docker compose down`.
Database data is preserved. Use `docker compose down -v` only when you want to
delete it as well.

## Development

### React UI components

The workspace uses strict TypeScript. Its bottom navigation is a React component
mounted in an isolated DOM root; the existing pages keep their own lifecycle.
It uses Lucide icons, Framer Motion, and Tailwind CSS 4. No images or additional
state providers are needed. The active tab follows the workspace URL, including
detail routes and browser back/forward navigation. The navbar stays at the bottom;
the top header is unchanged.

The default UI component directory is `apps/web/src/components/ui`, imported as
`@/components/ui`. In this monorepo, that is the web application's equivalent of
`/components/ui`; do not create a second directory at the repository root.
Keeping reusable React primitives here lets the shadcn CLI resolve the `ui` alias
and separates them from the existing DOM components in `src/components`.

- Component: `apps/web/src/components/ui/bottom-nav-bar.tsx`.
- Component styles: `apps/web/src/components/ui/bottom-nav-bar.css`, imported in
  Tailwind's components layer. The three-route pill is 220 × 52 px; its outer size
  stays fixed while a single 180 ms transition redistributes the active label space.
- Usage example: `apps/web/src/components/ui/demo.tsx` (not a demo page or route).
- Workspace integration: `apps/web/src/workspace/bottom-navigation.tsx`.
- Class helper: `apps/web/src/lib/utils.ts` (`clsx` and `tailwind-merge`).
- shadcn configuration: `apps/web/components.json`.
- Tailwind entry: `apps/web/src/styles/tailwind.css`.
- Existing page styles: `apps/web/src/app.css`, imported into Tailwind's base layer.

Install the checked-in dependencies from the repository root with
`bun install --frozen-lockfile`. TypeScript and JSX support are already configured;
there is no need to scaffold another application. The existing `bun run dev` and
`bun run build` commands compile both the React bundle and Tailwind stylesheet.
Tailwind preflight is intentionally omitted to preserve the native page styles.
Wrap future shadcn components in `.filika-ui` to apply the scoped theme tokens.

For a fresh, unconfigured application, the equivalent setup commands inside
`apps/web` are:

```sh
bun add react react-dom framer-motion lucide-react clsx tailwind-merge
bun add --dev @types/react @types/react-dom tailwindcss @tailwindcss/cli
bunx --bun shadcn@latest init
```

This repository already has the manual configuration. Do not rerun `init` over its
custom styles. To add another component, run `bunx --bun shadcn@latest add button`
from `apps/web`, and review the generated changes. See the official
[shadcn manual installation](https://ui.shadcn.com/docs/installation/manual) and
[Tailwind CLI setup](https://tailwindcss.com/docs/installation/tailwind-cli).

### Checks

```sh
bun run lint
bun run build
bun test
```

`lint` checks formatting, lint rules, and TypeScript types. `bun test` runs the
unit and database tests; Playwright browser tests run separately.

The unit suite also includes database tests. To run them, set `TEST_DATABASE_URL`
to a separate, disposable test database. These tests reset its schemas and are
skipped if the database is unavailable. Never use your workspace or production database.

## License

[Apache-2.0](LICENSE).
