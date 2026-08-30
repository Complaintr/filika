# Filika

Filika is a WebMCP-enabled feedback system. A user's browser AI drafts a bug,
complaint, or product suggestion; the user reviews and confirms it; maintainers
receive it in their project workspace.

Filika never sends agent-authored feedback before explicit user confirmation and
does not provide an AI model. Manual feedback remains available without WebMCP.

## Flow

1. A site installs the Filika SDK and review UI.
2. The browser AI drafts structured feedback through WebMCP.
3. The user reviews, edits, confirms, or cancels it.
4. The collector validates and stores confirmed feedback.
5. Maintainers read it in the Filika workspace.

## Repository

- `packages/sdk`: browser SDK and WebMCP protocol.
- `packages/collector`: validation, API, and PostgreSQL persistence.
- `apps/web`: review UI and maintainer workspace.
- `tests/e2e`: browser integration tests.

## Local development

Requires Bun 1.3.14 and Docker Compose.

```sh
bun install
docker compose up db -d
cp .env.example .env
bun run db:migrate
bun run db:seed
bun run dev
```

Open [localhost:4173](http://localhost:4173).

### Signing in with Google

Google sign-in is optional alongside email/password accounts. To enable it:

1. Create an OAuth client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (Application type: Web application).
2. Add `http://localhost:4173/api/auth/callback/google` as an authorized redirect URI.
3. Put the client ID and secret in `.env`:

   ```sh
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

4. Restart `bun run dev`.

Without Google credentials the app boots, but Google sign-in is unavailable. Set `BETTER_AUTH_SECRET` to a long random value in production.

### Email accounts and password recovery

Set these server-only values in `.env`, then restart the app:

```sh
RESEND_API_KEY=re_...
AUTH_EMAIL_FROM="Filika <auth@your-verified-domain.example>"
```

Use a sender domain verified in Resend. The key and sender are never sent to the
browser. Email signup requires verification before login. Verification links
expire after one hour; signing in with an unverified email sends a fresh link.
The `/forgot-password` page sends a single-use reset link valid for 30 minutes.
Resetting a password revokes existing sessions. Responses do not reveal whether
an email is registered. Email operations have request limits and a ten-second
provider timeout. Background delivery failures produce a generic server log;
check Resend delivery logs and retry from sign-in or password recovery.

Without email configuration, signup and recovery return a service-unavailable
error; Google sign-in remains independent. Authentication routes and `/terms`
are public. Review the workspace usage terms with your operator before making
this service available to users.

Implementation references: [Better Auth email/password authentication](https://better-auth.com/docs/authentication/email-password)
and [Resend email API](https://resend.com/docs/api-reference/emails/send-email).

### Workspace introduction

Email and Google sign-in open `/onboarding`. The four-step introduction lets a
maintainer choose a role, a local workspace display name, and an initial inbox
filter before reviewing how Filika collects user-confirmed feedback. Completion
is saved per account in this browser; it does not create a collector project or
install the SDK. Settings includes a link to reopen the guide. A completed guide
is skipped on subsequent sign-ins in the same browser.

Complaint details open in a keyboard-accessible dialog without leaving the list.
Direct report links remain available for sharing. Settings separates workspace,
appearance, account, connection, and privacy preferences with sidebar navigation.

## Verification

```sh
bun run check
bun run typecheck
bun run test:unit
bun run build
bun run test:browser
```

Use only dedicated disposable databases for unit and browser integration tests.

Filika is under active development and is not yet a hosted or published service.

## License

[Apache-2.0](LICENSE). Copyright 2026 Complaintr.
