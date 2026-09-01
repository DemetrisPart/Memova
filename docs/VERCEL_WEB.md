# Vercel — Web (`apps/web`)

Monorepo Next.js 15 app. Browser calls go to **same-origin** `/api/v1/*` (BFF proxy). Server/SSR uses `API_URL` → Fly API.

## Project settings (Vercel dashboard)

| Setting | Value |
|---------|--------|
| Framework | Next.js |
| Root Directory | `apps/web` |
| Include files outside root | **On** (needed for `packages/*` + pnpm workspace) |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build Command | `cd ../.. && pnpm --filter @momeva/shared build && pnpm --filter @momeva/web build` |
| Output | default (Next) |
| Node | **22.x** |
| Region | Frankfurt (EU) if available |

Package manager: **pnpm** (`packageManager` in root `package.json`).

## Environment variables (Preview + Production)

Set in Vercel → Project → Settings → Environment Variables.

| Variable | Required | Example (staging) | Notes |
|----------|----------|-------------------|--------|
| `API_URL` | Yes | `https://momeva-api.fly.dev` | Nest origin **without** `/v1` (code appends `/v1`) |
| `WEB_APP_URL` | Yes | `https://your-app.vercel.app` | Must match this Vercel URL (CORS on API uses it) |
| `ACCESS_TOKEN_COOKIE` | No | `momeva_access` | Same names as API |
| `REFRESH_TOKEN_COOKIE` | No | `momeva_refresh` | |
| `GUEST_SESSION_COOKIE` | No | `momeva_guest` | |

**Do not set** `NEXT_PUBLIC_API_URL` — guest/dashboard browser traffic uses `/api/v1` proxy.

**Dev-only (omit on Vercel production):**
- `MAILPIT_API_URL`
- `NEXT_PUBLIC_MOBILE_LAN_ORIGIN` / `NEXT_PUBLIC_MOBILE_PUBLIC_ORIGIN` (local phone testing)

## API must allow this origin

On Fly API (`WEB_APP_URL` / CORS):

```text
WEB_APP_URL=https://your-app.vercel.app
PUBLIC_EVENT_BASE_URL=https://your-app.vercel.app
```

QR codes and magic-link links must use the **Vercel HTTPS** origin — never LAN IP in staging/prod.

## First connect

1. Deploy API to Fly (health: `https://momeva-api.fly.dev/v1/health`).
2. Create Vercel project from GitHub repo `Memova`.
3. Apply settings + env above.
4. Deploy Preview → open guest `https://….vercel.app/wedding-3-oct-2026` (after DB has that event on staging).
5. Magic link: ensure Resend/SMTP on API; Mailpit only works locally.

## Checklist

- [ ] Root Directory = `apps/web`, outside-root files enabled
- [ ] `API_URL` points at Fly API
- [ ] `WEB_APP_URL` = this Vercel deployment URL
- [ ] API CORS / cookies work (login → dashboard)
- [ ] Guest upload works (presigned R2 URLs reachable from browser)
