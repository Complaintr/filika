FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY package.json bun.lock bunfig.toml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/collector/package.json packages/collector/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY tests/e2e/package.json tests/e2e/package.json

RUN bun install --frozen-lockfile

COPY . .

WORKDIR /app/apps/web
RUN bun run build:spa && bun run --bun next build

FROM oven/bun:1.3.14 AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Workspace manifests are installed with production-only dependencies so the
# runtime image carries no build tools, test runners, or type definitions.
COPY package.json bun.lock bunfig.toml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/collector/package.json packages/collector/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY tests/e2e/package.json tests/e2e/package.json

RUN bun install --frozen-lockfile --production

# Runtime assets only: the built Next.js output, static bundles, and the
# collector sources and migrations used by the entrypoint migration step.
COPY --from=build /app/apps/web/.next apps/web/.next
COPY --from=build /app/apps/web/public apps/web/public
COPY --from=build /app/apps/web/next.config.ts apps/web/next.config.ts
COPY --from=build /app/apps/web/tsconfig.json apps/web/tsconfig.json
COPY --from=build /app/packages/collector/src packages/collector/src
COPY --from=build /app/packages/collector/drizzle packages/collector/drizzle
COPY --from=build /app/packages/sdk/src packages/sdk/src
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run as a dedicated non-root user. Migrations only read drizzle/, and the
# Next.js server only writes to its own cache inside /app.
RUN useradd --create-home --shell /usr/sbin/nologin filika \
  && chown -R filika:filika /app /home/filika

USER filika

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD bun --bun -e 'fetch("http://127.0.0.1:3000/").then((r) => { process.exit(r.ok ? 0 : 1); }).catch(() => process.exit(1));'

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]