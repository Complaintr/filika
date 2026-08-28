# Release candidate artifacts

The [candidate manifest](../releases/candidate-manifest.json) identifies a locally
verified source checkout and exact artifacts. It is **not release approval**:
`releaseApproved` and `published` are false, and all unresolved checks are listed
under `openGates`. No tag, hosted endpoint, package publication, or deployment was
created. SDK/package versions remain `0.0.0`.

## Source and verification identity

The manifest's `sourceRevision` is
`93cc546f8ed62bee1a87dd1e52484aa65455c2c8`. All listed commands were run again in
the clean clone at that exact revision: 429 unit/API tests, 41 separately invoked
API tests (already included in 429), three database helper tests, and 36 browser
tests passed without skips. Build, install, typecheck, lint, migration, seed,
and cleanup also passed. See [the verification procedure](release-verification.md).

The manifest and frozen protocol data are added in a subsequent metadata commit.
A manifest cannot contain the hash of its own commit. `sourceRevision` identifies
the tested source, **not** that later commit, and `sourceTree` identifies its Git
tree. The later commit adds documentation, extracted data, and a regression test;
it does not change runtime code. Its new freeze test is not included in the 429
tests recorded for the earlier source revision.

After adding the frozen artifact and its regression test, the working checkout
also passed frozen install, formatting/lint (208 files), all workspace typechecks,
430 unit/API tests with five unchanged snapshots, the three database helper tests,
and build. Every local document link and every manifest checksum was verified.
These are follow-up checks of the metadata commit's contents, not replacements
for the manifest's explicitly revision-bound test results.

## V1 freeze

[v1-protocol.json](../releases/v1-protocol.json) captures the SDK's canonical tool
metadata, envelope, receipt, outcomes, limits, configuration, lifecycle, and review
event at the tested revision. Its exact byte checksum is in the manifest. The
existing contract suite now compares this artifact to the exported definitions
and verifies the checksum independently of the usual snapshots.

Preserve this V1 contract. Do not update the frozen artifact or snapshots just to
silence a failure. Changes require the explicit compatibility decision and
coordinated review in [the contract-change rule](sdk-contract.md#contract-changes-and-verification);
incompatible wire changes require a new schema version. The freeze identifies
the SDK contract, not universal browser or collector conformance. In particular,
the existing supplementary-Unicode limit discrepancy remains unresolved.

## Artifact checksums and SRI

`artifacts` contains production/development SDK JavaScript and metadata, plus the
local web demo output. All JavaScript entries have SHA-384 SRI calculated from
their actual bytes. Checksums also bind the lockfile, project license, dependency
inventory, contract document/snapshots, and migration metadata at `sourceRevision`.
The ordered migration list contains both SQL migrations and their SHA-256 values.
Collector code runs directly under Bun and has no separately compiled binary.

To reproduce, use a separate clean checkout at `sourceRevision` with Bun 1.3.14:

```sh
bun install --frozen-lockfile
bun run build
bun run --filter @filika/sdk build:development
```

Run those same build entry points twice and compare the eight artifact hashes
with the manifest. Both repeated builds matched in the recorded environment.
An initial comparison against the browser server's generated `index.js` differed
from the workspace build output; only the identical workspace build entry points
are claimed reproducible here. Browser tests build the demo through their own
server entry point. Do not assume web output bytes are interchangeable across
entry points, working directories, Bun versions, or platforms.

Verify each SDK `.meta.json` against its JavaScript bytes, including size, SHA-256,
and `sha384-` plus the base64-encoded SHA-384 digest. The development SDK copied
into the demo is byte-identical to the separately emitted development bundle.
Production and development hashes differ and must not be interchanged. Copy the
matching SRI into a future integration only after verifying the final served bytes.
The local web demo remains a development artifact, not deployment configuration.

For source checksums, read files from `sourceRevision`, not whatever the current
branch contains. The frozen protocol file is carried alongside the manifest in
the later commit and must be verified there. Generated `dist` outputs are not
committed; the manifest records how to reproduce and identify them.

## Outstanding release gates

Native DevTools and Inspector execution, real agent eval metrics, a human
screen-reader check, collector Unicode-limit alignment, and version-specific
dependency redistribution notices still need evidence or resolution. The later
Site Tools acceptance script remains preparation only. These open checks are
preserved in the machine-readable manifest. CI must also pass before any merge;
the local manifest does not assert a CI result.
