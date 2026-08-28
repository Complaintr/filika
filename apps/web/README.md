# Filika Web Application

This directory contains the deterministic demo application, the native feedback
review dialog, and the read-only maintainer inbox.

Frontend journey, state, wireframe, design-token, accessibility, sample-failure,
and style-isolation foundations are defined in `src/foundation`.
Frontend behavior contracts are defined in `src/contracts`. The Phase 2
components consume those contracts. The sample app now connects the real SDK to
the dialog and collector; receipt notifications open the exact record in the live inbox.
See the [local demo guide](../../docs/local-demo.md) for database setup, collector
startup, script attributes, and the exact end-to-end journey.

## Local journey

Run the web workspace from the repository root:

```sh
bun run --filter @filika/web dev
```

The local application includes:

- A normal checklist task and one deterministic, resettable save failure.
- A closed-input WebMCP demo task that produces the visible save failure.
- Manual feedback and `Filika.open()` paths backed by the same native dialog.
- Editable report fields, removable host context, validation, confirmation,
  bounded outcomes, and a receipt that does not echo report content.
- A read-only inbox with list, detail, loading, empty, error, not-found, and
  expired presentations.

Component and interaction coverage runs with the repository unit tests:

```sh
bun run test:unit
```
