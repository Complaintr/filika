# Local Development

## Prerequisite

Use Bun 1.3.14, as pinned by the root `package.json`.

## Reproducible install

Install exactly the dependency graph recorded in `bun.lock`:

```sh
bun install --frozen-lockfile
```

Use a regular install only when intentionally changing dependencies:

```sh
bun install
```

Commit the resulting `package.json` and `bun.lock` changes together.

## Type checking

Type-check every workspace with the shared strict configuration:

```sh
bun run typecheck
```

## Formatting and linting

Check formatting, lint rules, and import organization without changing files:

```sh
bun run check
```

Apply safe formatting and import-organization changes:

```sh
bun run check:fix
```

Formatting and linting can also be checked separately:

```sh
bun run format:check
bun run lint
```

## Tests and builds

Run the unit-test suites and build every workspace:

```sh
bun run test:unit
bun run build
```

The browser command runs Playwright against the real SDK, dialog, and collector.
Prepare a dedicated local `filika_e2e` database and install Chromium as described
in the [local demo guide](local-demo.md), then run:

```sh
bun run test:browser:prepare
bun run test:browser
```
