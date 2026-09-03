<p align="left">
  <img src="../filika.png" alt="Filika Logo" width="120">
</p>

# Self Hosted

Filika is designed to be easily self-hosted using standard production deployment methods. This guide covers the basics for a production setup.

## Production Requirements

- A PostgreSQL 16 database instance.
- Node.js environment (Bun is recommended but standard Node.js works for the built Next.js application).
- Domain name for your hosting environment with HTTPS enabled.

## Environment Configuration

You must provide the following environment variables for production. Refer to the [Local Setup Guide](local-setup.md) for detailed steps on acquiring OAuth and GitHub App credentials.

### Database & Security
- `DATABASE_URL`: Connection string to your production PostgreSQL database.
- `BETTER_AUTH_SECRET`: A secure random string for signing session tokens (generate a strong 64-character hex string).
- `BETTER_AUTH_URL`: The public HTTPS URL of your application (e.g., `https://filika.yourdomain.com`).

### Authentication (OAuth)
*Ensure your production URL is used as the homepage and callback URL when configuring these providers.*
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: For Google login.
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: For GitHub login.

### GitHub Integration (Issue Export)
- `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`: Your production GitHub App credentials.
- `GITHUB_APP_PRIVATE_KEY`: Your production GitHub App PEM private key (ensure newlines are formatted as `\n`).
- `GITHUB_TOKEN_ENCRYPTION_KEY`: A 64-character hex string for encrypting tokens at rest.
- `GITHUB_APP_WEBHOOK_SECRET`: Your secret to verify incoming webhooks.

### Email Delivery
- `RESEND_API_KEY`: Required for sending email verification and password recovery emails.
- `AUTH_EMAIL_FROM`: An email address on your verified domain.

## Building for Production

To build the application for a production environment:

1. Install dependencies:
   ```bash
   bun install
   ```
2. Build the Next.js application:
   ```bash
   bun run build
   ```
3. Start the production server:
   ```bash
   bun start
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
