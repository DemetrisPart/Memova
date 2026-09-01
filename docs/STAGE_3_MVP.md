# Stage 3 — MVP (Deploy & Ops)

**Status:** Phase 0–6 complete (MVP hardening locked)  
**Working list:** [STAGE_3_PHASE_6_HARDENING.md](./STAGE_3_PHASE_6_HARDENING.md)  
**Env catalogue:** [ENV.md](./ENV.md) · template: `.env.example`  
**Local URLs:** [DEV_URLS.md](./DEV_URLS.md)

---

## What ships in Stage 3 MVP

| Area | Apps |
|------|------|
| Guest event + upload + gallery | `apps/web` (`/[slug]`) |
| Couple dashboard | `apps/web` (`/dashboard`) |
| Platform admin | `apps/web` (`/admin`) |
| REST API | `apps/api` |
| Image worker | `apps/worker-media` |
| Postgres + Redis + MinIO | `docker/` (local) |

Product locks: **1 account = 1 event**; guest vs couple URLs are separate; Phase 4 guest flow is locked.

---

## Local run

```bash
pnpm docker:up
pnpm db:migrate:deploy
pnpm --filter @momeva/api dev          # :3001
pnpm --filter @momeva/worker-media dev
pnpm --filter @momeva/web dev          # :3000
```

Copy `.env.example` → `.env` first. See [ENV.md](./ENV.md).

### Hardening checks

```bash
node scripts/phase3-hardening-verify.mjs   # upload pipeline / MinIO / guest limits
node scripts/phase6-hardening-verify.mjs   # domain tests + RFC 7807 problem details
```

---

## Recommended production topology

Aligned with [STAGE_1_ARCHITECTURE.md](./STAGE_1_ARCHITECTURE.md) §9:

| Component | Hosting | Notes |
|-----------|---------|--------|
| Web (Next.js) | Vercel (EU) | `WEB_APP_URL` / `PUBLIC_EVENT_BASE_URL` = public origin |
| API (NestJS) | Fly.io / Railway (EU) | 2+ instances; Redis required for rate limits + BullMQ |
| Worker media | Fly.io (CPU) | Same Redis + storage as API |
| Postgres | Managed (EU) | Soft-delete + migrations |
| Object storage | Cloudflare R2 | See R2 block in `.env.example` |
| Email | Resend (or SMTP) | Magic links |

### Production checklist (before go-live)

- [ ] Strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (≥32 chars)
- [ ] `NODE_ENV=production` · `APP_ENV=production`
- [ ] `PUBLIC_EVENT_BASE_URL` / `WEB_APP_URL` = real HTTPS origin (never LAN IP in QR)
- [ ] R2 (or prod S3) credentials; no MinIO in prod
- [ ] Redis reachable from API + worker
- [ ] SMTP / Resend configured; magic-link emails deliver
- [ ] CORS / cookie domain match web origin (`Secure` cookies on HTTPS)
- [ ] Rate-limit env defaults reviewed (`.env.example`)
- [ ] Run Phase 3 + Phase 6 verify scripts against staging
- [ ] Promote first `PLATFORM_ADMIN` via `scripts/promote-admin.mjs` then re-login

---

## Errors

API errors use **RFC 7807** `application/problem+json` (`type`, `title`, `status`, `detail`, `instance`, `requestId`). Web clients prefer `detail` over legacy `message`.

---

## Phase index

| Phase | Doc |
|-------|-----|
| 0–3 | `PHASE_*_COMPLETE.md`, `STAGE_3_PHASE_*` |
| 4 Guest | [PHASE_4_GUEST_FLOW.md](./PHASE_4_GUEST_FLOW.md) |
| 5 Couple | [PHASE_5_COMPLETE.md](./PHASE_5_COMPLETE.md) |
| 6 Hardening | [STAGE_3_PHASE_6_HARDENING.md](./STAGE_3_PHASE_6_HARDENING.md) |
