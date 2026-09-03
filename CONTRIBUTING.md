# Contributing to Filika

We welcome contributions. Please review the following guidelines before submitting a pull request.

## Development Rules

1. Write all repository content in English.
2. Never use em dashes anywhere in the repository content. Use a colon, a hyphen, or a restructured sentence instead.
3. Use Bun 1.3.14. Do not introduce another package manager.
4. Keep TypeScript strict and avoid `any`. Validate data at trust boundaries.
5. Keep changes focused on the requested behavior and preserve unrelated work.
6. Add or update tests in the same pull request as behavior changes.

## Pull Requests

- Do not push directly to `main`. Use a focused pull request.
- Use the repository pull request template and complete every applicable section.
- Use a title in the form `type(scope): imperative summary`, where `type` is `feat`, `fix`, `test`, `docs`, `refactor`, `ci`, or `chore`.
- All required CI checks must pass before merge.

## Local Verification

During implementation, run the smallest relevant Bun test locally to protect code integrity and keep each logical change working. Prefer targeted commands such as `bun test path/to/relevant.test.ts`. After opening or updating a pull request, inspect the required GitHub checks and fix any failures before merge.
