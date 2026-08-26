#!/usr/bin/env bash
# Idempotent repository bootstrap for Momeva in a Cloud Agent VM.
# Prepares infra, dependencies, Prisma client, database schema, and builds.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[install] Ensuring infrastructure services are up"
bash "$REPO_ROOT/.cursor/start-services.sh"

echo "[install] Creating .env from .env.example (if missing)"
[ -f .env ] || cp .env.example .env

echo "[install] Installing dependencies"
pnpm install --frozen-lockfile

echo "[install] Generating Prisma client"
pnpm db:generate

echo "[install] Applying database migrations"
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)" pnpm db:migrate:deploy

echo "[install] Building packages and apps"
pnpm build

echo "[install] Verifying database connection"
pnpm db:test

echo "[install] Done"
