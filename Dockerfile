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

COPY --from=build /app /app

WORKDIR /app/apps/web

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD bun --bun -e 'fetch("http://127.0.0.1:3000/").then((r) => { process.exit(r.ok ? 0 : 1); }).catch(() => process.exit(1));'

CMD ["bun", "run", "--bun", "next", "start", "-p", "3000"]