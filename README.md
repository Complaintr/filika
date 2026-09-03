# Filika

Filika is a WebMCP-enabled feedback system. A user's browser AI drafts a bug,
complaint, or product suggestion; the collector stores it; maintainers receive
it in their application inbox.

Agent-authored feedback is transmitted without a user review step. Filika does
not provide an AI model. Manual feedback remains available without WebMCP.

## Flow

1. A site installs the Filika SDK.
2. The browser AI drafts structured feedback through WebMCP.
3. The collector validates and stores the feedback.
4. Maintainers read it in the application’s Filika inbox.

## Repository

- `packages/sdk`: browser SDK and WebMCP protocol.
- `packages/collector`: validation, API, and PostgreSQL persistence.
- `apps/web`: host application pages and maintainer workspace.
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
are public. Review the application usage terms with your operator before making
this service available to users.

Implementation references: [Better Auth email/password authentication](https://better-auth.com/docs/authentication/email-password)
and [Resend email API](https://resend.com/docs/api-reference/emails/send-email).

### Applications and account settings

After sign-in, `/onboarding` creates a real application owned by the account and
guides the user through a working connection. The user names the application,
approves one exact website origin, installs the generated browser script, and
sends one test report. The application is marked as verified only when
that report reaches its inbox. Setup can be finished later; an unverified
application keeps a **Continue setup** link in its workspace. Returning users
open their existing application, while **Create application** starts a shorter
version of the same connection flow.

The setup screen generates the application-specific script. A production
installation has this shape:

```html
<script
  src="https://your-filika-host.example/sdk/filika.js"
  data-project-key="app_your_public_application_key"
  data-endpoint="https://your-filika-host.example/api/v1/feedback"
  defer
></script>
```

The web build publishes both `/sdk/filika.js` and the loopback-only
`/sdk/filika.development.js`. The latter accepts HTTP only for localhost
development. The script registers the static Filika WebMCP feedback tool; it
does not read ambient page content. Agent-authored reports are transmitted
without a review step.

- `/eckra/dashboard`: statistics for Eckra only.
- `/eckra/complaints`: Eckra's reports and shareable complaint detail links.
- `/eckra/settings`: its name, default date range, SDK key, allowed origins,
  collector connection, and retention details.
- `/account`: account identity, Google profile photo, theme, spacing, and security.

Application slugs stay fixed when the display name changes. The collector
rejects unapproved website origins; an application without allowed origins
cannot receive feedback. All app reads and updates require the owner's session.
The old global read APIs are unavailable to signed-in clients; use
`/api/v1/apps/{slug}/inbox` and `/api/v1/apps/{slug}/dashboard` instead.
Existing `/dashboard` and `/complaints` links redirect to the first owned
application; `/settings` redirects to `/account`.

Google profile photos are optional. After Google sign-in, enable **Use Google
profile photo** on `/account` to show the provider's photo in the header, or
turn it off to use an initial. Password-only accounts cannot enable it; uploads
and arbitrary image URLs are not supported. Existing Google users should sign
in with Google again after this update to populate the new provider-photo field.
When enabled, the browser loads the image from Google's HTTPS image service
without a referrer. No additional Google scopes are requested.

Apply `bun run db:migrate` before starting the updated application. Migration
`0003_applications-and-account` adds ownership, slugs, application preferences,
and account settings without deleting existing records. Existing collector
projects without an owner remain unassigned and are hidden from account pages;
an operator must explicitly assign verified owners and unique slugs before
making historical reports available. Ownership is never guessed from an email
address or local browser preferences.

## Verification

```sh
bun run check
bun run typecheck
bun run test:unit
bun run build
bun run test:browser
```

Use only dedicated disposable databases for unit and browser integration tests.
Set `TEST_DATABASE_URL` for unit tests and `E2E_DATABASE_URL` to a loopback database
named `filika_e2e` for browser tests. Prepare it with `bun run test:browser:prepare`.
If the development server occupies port 4173, set `E2E_WEB_PORT=4183`; Playwright
uses its own `.next-e2e` output and never reuses the running development server.

Filika is under active development and is not yet a hosted or published service.

## License

[Apache-2.0](LICENSE). Copyright 2026 Complaintr.
