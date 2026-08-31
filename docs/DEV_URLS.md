# Dev URLs

Quick links for local + LAN testing. LAN IP may change — check `ipconfig` / `.env` if needed.

Current LAN host: **`192.168.0.103`**

## LAN (mobile)

| Page | URL |
|---|---|
| Home | http://192.168.0.103:3000 |
| Couple sign in | http://192.168.0.103:3000/auth/login |
| Create account | http://192.168.0.103:3000/auth/login?mode=register |
| Guest event | http://192.168.0.103:3000/wedding-3-oct-2026 |
| Guest QR | http://192.168.0.103:3000/wedding-3-oct-2026/qr |
| Dashboard | http://192.168.0.103:3000/dashboard |
| Admin (PLATFORM_ADMIN) | http://192.168.0.103:3000/admin |

On a **phone**, use the LAN IP above — `localhost` on the phone is the phone itself, not your PC.

Promote a user (then **sign out + sign in again**):

```bash
node scripts/promote-admin.mjs you@example.com
```

After sign-in, open Admin from the ☰ menu (**Platform admin**) or go to `/admin`.

Admin home shows **system health** (API / DB / queue). Tap **Enable browser alerts** to get a notification if something goes unhealthy while the admin tab is open.

## PC (localhost)

| Page | URL |
|---|---|
| Home | http://localhost:3000 |
| Couple sign in | http://localhost:3000/auth/login |
| Create account | http://localhost:3000/auth/login?mode=register |
| Guest event | http://localhost:3000/wedding-3-oct-2026 |
| Guest QR | http://localhost:3000/wedding-3-oct-2026/qr |
| Dashboard | http://localhost:3000/dashboard |

## API / infra

| Service | URL |
|---|---|
| API | http://localhost:3001 |
| API health | http://localhost:3001/v1/health |
| Mailpit | http://localhost:8025 |
| MinIO console | http://localhost:9001 |

## Start everything

```bash
pnpm docker:up
pnpm dev
```

Phone and PC must be on the same Wi‑Fi for LAN URLs.
