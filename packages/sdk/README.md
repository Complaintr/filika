# Filika Browser SDK

This package contains the V1 protocol contracts and the browser bundle skeleton.
See the [SDK contract](../../docs/sdk-contract.md) for exact fields, limits,
static WebMCP metadata, configuration, execution results, receipts, and lifecycle.

## Build

From the repository root, run `bun run --filter @filika/sdk build`.
esbuild produces `packages/sdk/dist/filika.js`: one classic IIFE script with a
`Filika` global and no external runtime imports. It can be loaded with an ordinary
`<script src="/path/to/filika.js"></script>` tag; no module loader is needed.

The current global exports the same contract constants and receipt parser as the
TypeScript entry point, plus `Filika.version` from package metadata. Importing or
loading it does not read the page, register tools, mount UI, or send requests.
`FilikaPublicApi` describes the Phase 2 runtime methods; `init`, `open`, and
`dispose` are not implemented in this contract-only skeleton. Do not use it as a
working feedback integration yet.

The build uses the [esbuild IIFE/global name API](https://esbuild.github.io/api/#global-name).
esbuild and the schema test validator are development dependencies only. Minified
release output, runtime initialization, SRI, publishing, and deployment remain
later-phase work. Generated `dist` files are not committed.
