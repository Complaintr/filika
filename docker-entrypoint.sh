#!/bin/sh
set -eu

# Apply pending database migrations before serving traffic. The script reads
# DATABASE_URL and resolves the drizzle migrations folder relative to the
# collector workspace, so it must run from the repository root.
cd /app
bun run --filter @filika/collector db:migrate

# Start the Next.js server that embeds the collector and auth routes.
cd /app/apps/web
exec bun run --bun next start -p 3000