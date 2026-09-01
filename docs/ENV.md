# Environment Variables

Copy `.env.example` to `.env` at the repository root before running any app.  
Full deploy notes: [STAGE_3_MVP.md](./STAGE_3_MVP.md).

## Required (all phases)

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://momeva:momeva@localhost:5432/momeva` |
| `NODE_ENV` | Yes | Runtime environment | `development` |
| `APP_ENV` | Yes | App environment label (storage paths) | `development` |
| `API_PORT` | Yes | NestJS listen port | `3001` |
| `API_URL` | Yes | API origin for SSR / scripts | `http://localhost:3001` |
| `WEB_APP_URL` | Yes | Next.js origin (CORS + magic links) | `http://localhost:3000` |
| `PUBLIC_EVENT_BASE_URL` | Yes | Guest/QR public base URL | `http://localhost:3000` |

## Auth (Phase 1+)

| Variable | Required | Description | Example |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | Yes | Access token signing secret (min 32 chars) | — |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret | — |
| `MAGIC_LINK_TTL_MINUTES` | No | Magic link expiry | `15` |
| `ACCESS_TOKEN_COOKIE` | No | HTTP-only access cookie name | `momeva_access` |
| `REFRESH_TOKEN_COOKIE` | No | HTTP-only refresh cookie name | `momeva_refresh` |
| `GUEST_SESSION_COOKIE` | No | Guest session cookie name | `momeva_guest` |

## Infrastructure (Docker / Phase 3+)

| Variable | Required | Description | Example |
|---|---|---|---|
| `REDIS_URL` | Yes | BullMQ + rate limits | `redis://localhost:6379` |
| `STORAGE_ENDPOINT` | Yes | S3-compatible endpoint | `http://localhost:9000` |
| `STORAGE_REGION` | Yes | Storage region | `us-east-1` |
| `STORAGE_BUCKET` | Yes | Bucket name | `momeva` |
| `STORAGE_ACCESS_KEY_ID` | Yes | Access key | `minioadmin` |
| `STORAGE_SECRET_ACCESS_KEY` | Yes | Secret key | `minioadmin` |
| `STORAGE_FORCE_PATH_STYLE` | Yes | Path-style URLs (MinIO/R2) | `true` |
| `STORAGE_LAN_ENDPOINT` | Dev | Browser MinIO on LAN | `http://192.168.x.x:9000` |
| `STORAGE_PUBLIC_ENDPOINT` | Dev | Browser MinIO via Tailscale/ngrok | — |

## Rate limiting (Phase 3 / 6)

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_API_GLOBAL_PER_IP_MINUTE` | `300` | Global API requests per IP per minute |
| `RATE_LIMIT_GUEST_SESSION_PER_IP_HOUR` | `10` | Guest session creates per IP per hour |
| `RATE_LIMIT_UPLOAD_INIT_PER_SESSION_HOUR` | `30` | Upload init per guest session per hour |
| `RATE_LIMIT_UPLOAD_COMPLETE_PER_SESSION_HOUR` | `60` | Upload complete per guest session per hour |
| `RATE_LIMIT_AUTH_MAGIC_LINK_PER_IP_HOUR` | `10` | Register + magic-link requests per IP per hour |

## Worker (Phase 3+)

| Variable | Default | Description |
|---|---|---|
| `WORKER_MEDIA_CONCURRENCY` | `2` | Sharp worker concurrency |
| `MEDIA_QUEUE_JOB_ATTEMPTS` | `3` | BullMQ job attempts |

## Email (Phase 1+)

| Variable | Required | Description | Example |
|---|---|---|---|
| `SMTP_HOST` | Yes | SMTP server | `localhost` |
| `SMTP_PORT` | Yes | SMTP port | `1025` |
| `SMTP_FROM` | No | From header | `Momeva <noreply@momeva.com>` |
| `MAILPIT_WEB_URL` | Dev | Mailpit UI | `http://localhost:8025` |
| `RESEND_API_KEY` | Prod | Resend (optional path) | — |

## Logging

| Variable | Default | Description |
|---|---|---|
| `LOG_LEVEL` | `info` | Pino log level |
| `SERVICE_NAME` | `momeva` | Service identifier in logs |

## Mobile network (dev)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_MOBILE_LAN_ORIGIN` | Guest web origin on LAN Wi-Fi |
| `NEXT_PUBLIC_MOBILE_PUBLIC_ORIGIN` | Guest web origin on Tailscale/public tunnel |

## Production (R2)

See commented R2 block in `.env.example`.
