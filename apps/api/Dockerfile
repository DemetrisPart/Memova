# API — production image (NestJS)

# Build from repo root:
#   docker build -f apps/api/Dockerfile -t momeva-api .

FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/domain/package.json packages/domain/
COPY packages/logging/package.json packages/logging/
COPY packages/shared/package.json packages/shared/
COPY packages/storage/package.json packages/storage/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @momeva/database generate \
  && pnpm --filter @momeva/shared build \
  && pnpm --filter @momeva/logging build \
  && pnpm --filter @momeva/domain build \
  && pnpm --filter @momeva/storage build \
  && pnpm --filter @momeva/database build \
  && pnpm --filter @momeva/api build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate \
  && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages

EXPOSE 3001
CMD ["pnpm", "--filter", "@momeva/api", "start"]
