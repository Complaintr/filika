# Filika Browser SDK

This package contains the V1 protocol contracts and the browser SDK.
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
esbuild and the schema test validator are development dependencies only. The
production bundle is minified and requires HTTPS. Each build also emits
`filika.meta.json` with stable version, compiler, mode, input paths, byte count,
SHA-256 checksum, and a SHA-384 Subresource Integrity value in `integrity`; no
timestamps or absolute filesystem paths are included. Both hashes are calculated
from the exact emitted JavaScript bytes. Repeated builds with the same source,
locked dependencies, and Bun version produce the same metadata.

Copy the `integrity` value from the matching `.meta.json` into the script tag's
`integrity` attribute. For a future cross-origin script, also use
`crossorigin="anonymous"` and a script origin that permits CORS. Do not reuse the
production hash for the development bundle or change the bytes after hashing.
Rebuild and update the matching integrity value after any source change. Nothing
is published or deployed, and no CDN or host configuration is added.

For local HTTP testing, run `bun run --filter @filika/sdk build:development`.
This produces `filika.development.js` and its metadata, allowing HTTP only for
exact loopback hosts. The production global has no development-mode switch.
Generated `dist` files are not committed.

## Runtime dependencies

The browser SDK has no runtime package dependencies. esbuild and Ajv are build
and test tools only. Both bundle modes reject external imports and input files
outside SDK source and its package metadata. The emitted metadata lists the
bundle inputs so consumers can inspect exactly what is included.
