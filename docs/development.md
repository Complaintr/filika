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
