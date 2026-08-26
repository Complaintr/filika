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
