#!/usr/bin/env bash
# Starts local dev infrastructure (Postgres, Redis, MinIO, Mailpit) for Momeva
# inside a Cloud Agent VM where Docker/systemd are unavailable. Idempotent:
# safe to run on every boot.
set -uo pipefail

log() { echo "[start-services] $*"; }

DATA_ROOT="${MOMEVA_DATA_ROOT:-$HOME/.momeva-dev}"
MINIO_DATA="$DATA_ROOT/minio"
REDIS_DATA="$DATA_ROOT/redis"
LOG_DIR="$DATA_ROOT/logs"
mkdir -p "$MINIO_DATA" "$REDIS_DATA" "$LOG_DIR"

# ---------------------------------------------------------------------------
# PostgreSQL
# ---------------------------------------------------------------------------
if pg_lsclusters -h 2>/dev/null | awk '{print $4}' | grep -q online; then
  log "Postgres already online"
else
  log "Starting Postgres cluster 16 main"
  sudo pg_ctlcluster 16 main start || true
fi

# Wait for readiness
for i in $(seq 1 30); do
  if pg_isready -h localhost -p 5432 -q; then break; fi
  sleep 1
done
pg_isready -h localhost -p 5432 -q && log "Postgres ready" || log "WARN: Postgres not ready"

# Ensure role + database exist
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='momeva'" 2>/dev/null | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE momeva WITH LOGIN PASSWORD 'momeva';" >/dev/null 2>&1
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='momeva'" 2>/dev/null | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE momeva OWNER momeva;" >/dev/null 2>&1

# ---------------------------------------------------------------------------
# Redis
# ---------------------------------------------------------------------------
if redis-cli ping >/dev/null 2>&1; then
  log "Redis already running"
else
  log "Starting Redis"
  redis-server --daemonize yes --dir "$REDIS_DATA" --logfile "$LOG_DIR/redis.log"
  for i in $(seq 1 20); do redis-cli ping >/dev/null 2>&1 && break; sleep 0.5; done
fi
redis-cli ping >/dev/null 2>&1 && log "Redis ready" || log "WARN: Redis not ready"

# ---------------------------------------------------------------------------
# MinIO (S3-compatible object storage)
# ---------------------------------------------------------------------------
if curl -fsS http://localhost:9000/minio/health/live >/dev/null 2>&1; then
  log "MinIO already running"
else
  log "Starting MinIO"
  MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin \
  MINIO_API_CORS_ALLOW_ORIGIN="*" \
    nohup minio server "$MINIO_DATA" --address ":9000" --console-address ":9001" \
    >"$LOG_DIR/minio.log" 2>&1 &
  for i in $(seq 1 30); do
    curl -fsS http://localhost:9000/minio/health/live >/dev/null 2>&1 && break
    sleep 1
  done
fi
if curl -fsS http://localhost:9000/minio/health/live >/dev/null 2>&1; then
  log "MinIO ready"
  # Ensure bucket exists
  mc alias set localminio http://localhost:9000 minioadmin minioadmin >/dev/null 2>&1
  mc mb --ignore-existing localminio/momeva >/dev/null 2>&1
  mc anonymous set download localminio/momeva >/dev/null 2>&1 || true
else
  log "WARN: MinIO not ready"
fi

# ---------------------------------------------------------------------------
# Mailpit (SMTP + web UI)
# ---------------------------------------------------------------------------
if curl -fsS http://localhost:8025 >/dev/null 2>&1; then
  log "Mailpit already running"
else
  log "Starting Mailpit"
  nohup mailpit --smtp 0.0.0.0:1025 --listen 0.0.0.0:8025 \
    >"$LOG_DIR/mailpit.log" 2>&1 &
  for i in $(seq 1 20); do curl -fsS http://localhost:8025 >/dev/null 2>&1 && break; sleep 0.5; done
fi
curl -fsS http://localhost:8025 >/dev/null 2>&1 && log "Mailpit ready" || log "WARN: Mailpit not ready"

log "All infrastructure services started"
