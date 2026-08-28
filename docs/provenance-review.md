# Source provenance and dependency review

Reviewed on 2026-08-28 against `e5d4328` and the audit changes accompanying this
report. Scope: 236 tracked files before the audit additions, including source,
tests, inline graphics, documentation, migrations, package metadata, and the lock
file. Untracked local assets and ignored build outputs were excluded and were
not imported. No private history or source from another repository was used.

## Source review

- Inspected this repository's file inventory and relevant source history, naming,
  attribution markers, URLs, design tokens, inline SVGs, and SDK bundle inputs.
  No separately tracked image, font, video, PDF, or vendored minified script was
  found. The UI uses inline graphics and local/system fonts.
- The existing repository organization in repository/issue URLs and the release
  link template is repository identity, not evidence of copied application code.
  No code or assets from that organization's other repositories were consulted.
- The SDK build restricts inputs to its source and package metadata and rejects
  external runtime imports. Its production and development bundle tests passed.
  The local theme preference belongs to the demo UI; it is not SDK telemetry.
- Targeted scans found no private-key blocks or GitHub token-shaped credentials.
  One internal task label in a test description was removed without changing its
  assertions. These scans are limited checks, not proof that all possible secrets
  or unattributed text can be detected automatically.
- The new README, challenge explanation, and evaluation material were written for
  Filika. References link to primary documentation. The Apache license is the
  standard official text, verified byte-for-byte rather than rewritten.

This review found no source requiring removal as imported third-party product
material. Repository inspection cannot prove the independent authorship of every
pre-existing line or generic icon shape. No contributor ownership attestation or
legal clearance is implied; uncertain future assets need provenance before use.

## Locked dependency inventory

[dependency-licenses.json](dependency-licenses.json) records every unique registry
package/version from `bun.lock`, including dependencies not installed on this OS.
There are **121 unique versions across 122 lock entries**, including **84 platform
optional versions**. For every version, the exact-version npm registry metadata
provided a license declaration and a distribution integrity value matching the
lock. No missing declaration or integrity mismatch was found.

| Declared license expression | Unique versions |
| --- | ---: |
| MIT | 102 |
| MIT OR Apache-2.0 | 9 |
| Apache-2.0 | 6 |
| BSD-2-Clause | 1 |
| BSD-3-Clause | 2 |
| Unlicense | 1 |

The SDK bundles no third-party runtime package. The collector's installed runtime
dependencies are `drizzle-orm@0.45.2` (Apache-2.0), `postgres@3.4.9` (Unlicense), and
`zod@4.4.3` (MIT). Other registry packages support development, testing, building,
or optional platform binaries. The web/e2e workspace runtime references are
local Filika packages, not additional registry dependencies.

## License-text and redistribution limits

Zod's installed `LICENSE` contains its MIT notice. The installed Drizzle and
Postgres packages do not contain separate license/notice files; their registry
declarations were verified, and their upstream
[Drizzle license](https://github.com/drizzle-team/drizzle-orm/blob/main/LICENSE)
and [Postgres license](https://github.com/porsager/postgres/blob/master/UNLICENSE)
were inspected. The current upstream branch is not proof of a particular
published tarball's notice contents. Do not silently substitute Filika's own
license for either dependency.

This is a declaration/integrity audit for the complete locked graph, plus runtime
package text inspection. It is not a complete legal review of every optional
binary, browser download, system library, or PostgreSQL image. Before distributing
a collector binary/container or bundled dependency archive, assemble and verify
version-specific license/notice texts (including the two absent runtime texts)
and any transitive binary notices. That packaging gate remains open; this work
does not publish or redistribute a dependency bundle. Preserve upstream notices
and chosen dual-license terms when preparing one.

## Reproduction

1. Install with Bun 1.3.14 and `bun install --frozen-lockfile`.
2. Enumerate the registry records in `bun.lock`, deduplicating by package name
   and exact version; include nested resolution aliases and platform optionals.
3. Fetch each inventory row's `registryMetadata` URL. Compare name/version, license,
   and `dist.integrity` with the row and lock entry; do not fetch latest versions.
4. Inspect installed runtime package license/notice files and repeat the tracked
   source/asset scans. Record missing text instead of inferring it from a name.
5. Regenerate the inventory only when the lock changes and repeat review. Its
   lockfile checksum ties this report to a specific dependency graph.
