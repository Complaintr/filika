# Licensing and package metadata

Filika's repository license is [Apache License 2.0](../LICENSE). The license text
is the unmodified [Apache Foundation text](https://www.apache.org/licenses/LICENSE-2.0.txt),
retrieved on 2026-08-28. It is a standard license, not application code imported
from another project. No copyright owner or contributor attribution was invented.

The root and all four workspace packages declare `Apache-2.0`, a description,
the actual repository URL, the correct workspace directory where applicable,
and the repository issue tracker. They remain `private: true` at version `0.0.0`;
these metadata additions do not publish a package or create a release version.
The SDK's runtime version is derived from its own package metadata. Bun remains
pinned to 1.3.14, with the existing locked dependency graph.

Dependencies retain their own licenses; the repository license does not relicense
them. Review the dependency inventory and bundled license/notice files before
redistributing dependencies. A source or binary release must preserve applicable
third-party notices. No claim is made that every dependency is Apache-licensed.
See the [provenance and dependency review](provenance-review.md) and
[complete locked inventory](dependency-licenses.json) for scope and packaging gaps.

Verification: compare `LICENSE` byte-for-byte with the linked canonical text,
inspect all five package manifests, run `bun install --frozen-lockfile`, and run
the SDK contract and bundle tests. Do not add a publication registry, author
identity, or fabricated ownership statement as part of metadata maintenance.
