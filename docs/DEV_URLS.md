# Dev URLs

Quick links for local + LAN testing. LAN IP may change — check `ipconfig` / `.env` if needed.

Current LAN host: **`192.168.0.103`**  
Default test event: **`wedding-3-oct-2026`**

## LAN (mobile)

| Page | URL |
|---|---|
| Home | http://192.168.0.103:3000 |
| Couple sign in | http://192.168.0.103:3000/auth/login?next=/dashboard |
| Create account | http://192.168.0.103:3000/auth/login?mode=register&next=/dashboard |
| Couple dashboard | http://192.168.0.103:3000/dashboard |
| Guest event | http://192.168.0.103:3000/wedding-3-oct-2026 |
| Guest QR | http://192.168.0.103:3000/wedding-3-oct-2026/qr |
| Admin (PLATFORM_ADMIN) | http://192.168.0.103:3000/admin |
| Admin sign-in | http://192.168.0.103:3000/auth/login?next=/admin |
| Mailpit (emails) | http://192.168.0.103:8025 |

On a **phone**, use the LAN IP above — `localhost` on the phone is the phone itself, not your PC.

**Emails on iPhone (same Wi‑Fi):** open http://192.168.0.103:8025 → tap a message → tap **View your gallery** (opens the couple gallery on LAN). If the button does nothing, use Desktop view in Mailpit or open the message HTML view — the PC “phone frame” preview can block taps.

- **Couple** → sign in with `next=/dashboard` → opens **Demetris & Daniella** (`wedding-3-oct-2026`).
- **Guest** → open `/wedding-3-oct-2026` (Upload Photos / View Gallery). Do **not** use this after couple login.

Promote a user (then **sign out + sign in again**):

```bash
node scripts/promote-admin.mjs you@example.com
```

After sign-in, open Admin from the ☰ menu (**Platform admin**) or go to `/admin`.

Admin home shows **system health** (API / DB / queue). Tap **Enable browser alerts** to get a notification if something goes unhealthy while the admin tab is open.

Couple **Settings → Notifications by email** saves optional prefs (expiry / first guest photo / storage). **Wedding day countdown** and **50 photos** emails are always sent by Momeva. Timed reminders run from the media worker scheduler (~every 15 minutes); first-photo / near-full / 50-photo fire when media becomes ACTIVE.

## PC (localhost)

| Page | URL |
|---|---|
| Home | http://localhost:3000 |
| Couple sign in | http://localhost:3000/auth/login?next=/dashboard |
| Create account | http://localhost:3000/auth/login?mode=register&next=/dashboard |
| Couple dashboard | http://localhost:3000/dashboard |
| Guest event | http://localhost:3000/wedding-3-oct-2026 |
| Guest QR | http://localhost:3000/wedding-3-oct-2026/qr |
| Admin | http://localhost:3000/admin |
| Admin sign-in | http://localhost:3000/auth/login?next=/admin |

## API / infra

| Service | URL |
|---|---|
| API | http://localhost:3001 |
| API health | http://localhost:3001/v1/health |
| Mailpit | http://localhost:8025 |
| Mailpit (phone / LAN) | http://192.168.0.103:8025 |
| MinIO console | http://localhost:9001 |

## Start everything

```bash
pnpm docker:up
pnpm dev
```

Phone and PC must be on the same Wi‑Fi for LAN URLs.
