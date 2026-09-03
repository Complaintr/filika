# Self-Hosting

<p align="left">
  <img src="../filika.png" alt="Filika" width="800">
</p>

Filika includes a production Dockerfile that builds the application, applies pending database migrations, and starts the Next.js server. This guide covers the required production configuration and the supported deployment flow.

## Production Requirements

- A PostgreSQL 16 database instance.
- Docker with support for multi-stage builds.
- Domain name for your hosting environment with HTTPS enabled.

## Environment Configuration

You must provide the following environment variables for production. Refer to the [Local Setup Guide](local-setup.md) for detailed steps on acquiring OAuth and GitHub App credentials.

### Database and Security

- `DATABASE_URL`: Connection string to your production PostgreSQL database.
- `BETTER_AUTH_SECRET`: A secure random string for signing session tokens (generate a strong 64-character hex string).
- `BETTER_AUTH_URL`: The public HTTPS URL of your application (e.g., `https://filika.yourdomain.com`).

### Authentication (OAuth)

Use your production URL as the homepage and callback URL when configuring these providers. OAuth providers are optional, but at least one working authentication method is required for maintainer accounts.

- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: For Google login.
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: For GitHub login.

### GitHub Integration (Issue Export)

These variables are optional unless you enable GitHub issue export.

- `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`: Your production GitHub App credentials.
- `GITHUB_APP_PRIVATE_KEY`: Your production GitHub App PEM private key (ensure newlines are formatted as `\n`).
- `GITHUB_TOKEN_ENCRYPTION_KEY`: A 64-character hex string for encrypting tokens at rest.
- `GITHUB_APP_WEBHOOK_SECRET`: Your secret to verify incoming webhooks.

### Email Delivery

These variables are required for email registration, verification, and password recovery.

- `RESEND_API_KEY`: Required for sending email verification and password recovery emails.
- `AUTH_EMAIL_FROM`: An email address on your verified domain.

## Deploying with Docker

Build the production image from the repository root:

```bash
docker build -t filika .
```

Run the image with your production environment file:

```bash
docker run --env-file .env.production -p 3000:3000 filika
```

The container applies pending database migrations before starting the application on port `3000`. Configure your reverse proxy to terminate HTTPS and forward traffic to that port. Keep the production environment file outside the image and never commit it to the repository.

To run the already-built application without Docker, use Bun 1.3.14. Apply migrations from the repository root, then start Next.js from the web workspace:

```bash
bun run db:migrate
cd apps/web
bun run --bun next start -p 3000
```

## Using the SDK in Production

Embed the lightweight Filika SDK into your web application by adding this script tag to your HTML:

```html
<script
  src="https://filika.yourdomain.com/sdk/filika.js"
  data-project-key="app_your_public_application_key"
  data-endpoint="https://filika.yourdomain.com/api/v1/feedback"
  defer
></script>
```

Make sure you configure the allowed origins in your application settings on the dashboard.
