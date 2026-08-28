# Filika

Filika lets browser agents turn problems they encounter on a website into feedback
for its maintainers. The agent prepares a report through WebMCP, the user reviews
and approves it, and the maintainer reads it in an inbox.

Nothing is sent until the user confirms. Users can also write feedback themselves,
without an agent or WebMCP support.

This repository contains the browser SDK, feedback dialog, collector API, and a
demo application. It runs locally; there is no hosted service or published package.

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
continuing. The database credentials below are for local development only.

### 2. Set up the database and start the API

```sh
export DATABASE_URL=postgres://filika:filika@localhost:55432/filika
bun run db:migrate
bun run db:seed
bun run dev:collector
```

Leave this terminal running. The API listens on port **8787**.

### 3. Start the demo

In a second terminal:

```sh
bun run dev
```

Open [localhost:4173](http://localhost:4173). Restart this command after source
changes; the development server does not hot reload.

## Try it

1. Run the sample task to trigger the demo's intentional save failure.
2. Click **Send feedback**, or let a WebMCP-capable agent draft a report.
3. Edit the report, select **Review submission**, then confirm with **Send feedback**.
4. Select **View in inbox** on the receipt to see the saved report.

Reports are publicly readable. Use sample data, never passwords or personal
information. Reports older than 24 hours are deleted when you run
`bun run db:cleanup` with the same `DATABASE_URL`.

To stop, press `Ctrl+C` in both terminals and run `docker compose down`.
Database data is preserved. Use `docker compose down -v` only when you want to
delete it as well.

## Development

```sh
bun run lint
bun run build
bun test
```

`lint` checks formatting, lint rules, and TypeScript types. `bun test` runs the
unit and database tests; Playwright browser tests run separately.

The unit suite also includes database tests. To run them, set `TEST_DATABASE_URL`
to a separate, disposable test database. These tests reset its schemas and are
skipped if the database is unavailable. Never use your demo or production database.

## License

[Apache-2.0](LICENSE).
