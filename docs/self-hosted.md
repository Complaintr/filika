# Self Hosted

Filika is designed to be easily self hosted using standard production deployment methods. This guide covers the basics for a production setup.

## Production Requirements

- A PostgreSQL 16 database instance.
- Node.js environment (Bun is recommended but standard Node.js works for the built Next.js application).
- Domain name for your hosting environment.

## Environment Configuration

You must provide the following environment variables for production:

- `DATABASE_URL`: Connection string to your production PostgreSQL database.
- `BETTER_AUTH_SECRET`: A secure random string for signing session tokens.
- `BETTER_AUTH_URL`: The public URL of your application.
- `GITHUB_APP_ID`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`: Required if you want to enable GitHub integration.
- `RESEND_API_KEY`: Required for sending email verification and password recovery emails.

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
  src="https://your-filika-host.example/sdk/filika.js"
  data-project-key="app_your_public_application_key"
  data-endpoint="https://your-filika-host.example/api/v1/feedback"
  defer
></script>
```

Make sure you configure the allowed origins in your application settings on the dashboard.
