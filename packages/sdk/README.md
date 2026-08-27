# Filika Browser SDK

This package contains the V1 protocol contracts and the Phase 2 SDK core.
See the [SDK contract](../../docs/sdk-contract.md) for exact fields, limits,
static WebMCP metadata, configuration, execution results, receipts, and lifecycle.

## Build

From the repository root, run `bun run --filter @filika/sdk build`.
esbuild produces `packages/sdk/dist/filika.js`: one classic IIFE script with a
`Filika` global and no external runtime imports. It can be loaded with an ordinary
`<script src="/path/to/filika.js"></script>` tag; no module loader is needed.

The global exposes contract constants, `version`, `init`, `open`, `status`, and
`dispose`. Script attributes trigger initialization and tool registration. Loading
without attributes leaves it uninitialized. No request is sent without review.
See [runtime integration](../../docs/sdk-runtime.md) to connect the frontend
review adapter. The native dialog, manual button, and collector server are not
implemented by this package.

The build uses the [esbuild IIFE/global name API](https://esbuild.github.io/api/#global-name).
esbuild and the schema test validator are development dependencies only. Minified
release output, runtime initialization, SRI, publishing, and deployment remain
later-phase work. Generated `dist` files are not committed.
