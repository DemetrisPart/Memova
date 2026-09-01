# Worker media — production image (BullMQ + Sharp)

# Build from repo root:
#   docker build -f apps/worker-media/Dockerfile -t momeva-worker-media .

FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker-media/package.json apps/worker-media/
COPY packages/database/package.json packages/database/
COPY packages/domain/package.json packages/domain/
COPY packages/logging/package.json packages/logging/
COPY packages/shared/package.json packages/shared/
COPY packages/storage/package.json packages/storage/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages packages
COPY apps/worker-media apps/worker-media
RUN pnpm --filter @momeva/database generate \
  && pnpm --filter @momeva/shared build \
  && pnpm --filter @momeva/logging build \
  && pnpm --filter @momeva/domain build \
  && pnpm --filter @momeva/storage build \
  && pnpm --filter @momeva/database build \
  && pnpm --filter @momeva/worker-media build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate \
  && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker-media ./apps/worker-media
COPY --from=build /app/packages ./packages

CMD ["pnpm", "--filter", "@momeva/worker-media", "start"]
