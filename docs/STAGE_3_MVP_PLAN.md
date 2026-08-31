# Stage 3 — MVP Implementation Plan

**Status:** Phase 0 in progress — approved with final adjustments (v1.1)  
**Goal:** Couple creates event → guests scan QR → upload photos → couple views/manages gallery

---

## 1. Final MVP Scope

### In Scope

| # | Feature | MVP Deliverable |
|---|---|---|
| 1 | **Couple account** | Registration via email; magic link login; JWT session; dashboard access |
| 2 | **Create event** | Bride/groom names, event title, date, slug, cover photo; unique event ID + QR code |
| 3 | **Public event page** | `momeva.com/[slug]` — names, date, cover, Upload + Gallery CTAs |
| 4 | **Guest upload** | Name entry (first + optional last); photos only; max 10 per batch; direct-to-storage |
| 5 | **Photo storage** | Cloudflare R2 (prod) / MinIO (local); metadata in PostgreSQL; signed URLs |
| 6 | **Image processing** | Thumbnail + web-optimized variant (Sharp); originals preserved |
| 7 | **Gallery** | Guest sees own uploads only; couple sees all; privacy enum in DB (`own_uploads_only` default) |
| 8 | **Couple dashboard** | Overview, photo count, storage usage, gallery, QR display/download, event settings |
| 9 | **Security** | Event isolation, permission guards, MIME validation, size limits, rate limiting |

### Explicitly Out of Scope (Later Stages)

Payments · Stripe · Plans UI · AI · Video upload/processing/HLS · CDN tuning · Analytics · Platform admin · PWA · i18n (EN-only strings) · Themes · White-label · Expiration billing · ZIP export · Email notifications (except magic link) · Virus scan (ClamAV → V1)

### Stage 2 Refinements — MVP Subset

| Refinement | MVP |
|---|---|
| Upload resume + session ID | ✅ Yes |
| Guest upload abuse limits | ✅ Yes (per batch + per session caps) |
| Storage remaining banner (≥ 80%) | ✅ Yes |
| First-upload privacy notice | ✅ Yes |
| First name + optional last name | ✅ Yes |
| `show_guest_names_publicly` setting | ✅ DB field; UI toggle deferred |
| Privacy mode switch UI | ❌ DB only; hardcoded default |
| Event page: Upload strongest CTA, minimal text | ✅ Yes |
| Gallery lazy load + infinite scroll | ✅ Yes |
| Original download (couple) | ✅ Yes |
| EventHealthIndicator | ✅ Active only (no expiry UX without billing) |
| Upload activity timeline | ✅ Yes |
| SEO noindex + Open Graph | ✅ Yes |
| WCAG basics | ✅ Focus rings, labels, contrast |

### Default Limits (Hardcoded for MVP — No Payments)

| Setting | Value |
|---|---|
| Storage per event | 20 GB |
| Max photo size | 15 MB |
| Max photos per upload batch | 10 |
| Max photos per guest session / hour | 50 |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` |

---

## 2. Implementation Order

### Phase 0 — Foundation (Day 1–2)
1. Turborepo monorepo scaffold (`pnpm`, `apps/web`, `apps/api`, `packages/*`)
2. Retire Expo scaffold to `legacy/expo/` (preserve history)
3. PostgreSQL + Prisma schema (MVP tables only)
4. Docker Compose: Postgres, Redis, MinIO
5. Environment config + README setup guide

### Phase 1 — API Core (Day 2–4)
6. NestJS app bootstrap, health check, OpenAPI stub
7. `packages/domain` — entities, use cases (events, media, auth interfaces)
8. `packages/database` — Prisma client + migrations
9. Magic link auth (request link → verify token → JWT)
10. Couple registration/login endpoints
11. Auth guards (couple JWT, guest session)

### Phase 2 — Events (Day 4–5)

**Spec:** [STAGE_3_PHASE_2_EVENTS.md](./STAGE_3_PHASE_2_EVENTS.md) · **Done:** [PHASE_2_COMPLETE.md](./PHASE_2_COMPLETE.md)

12. Create event endpoint + slug validation
13. Update event / settings endpoints
14. Cover photo upload (presigned URL flow)
15. QR code generation (PNG via `qrcode` library, stored in R2 or generated on demand)

### Phase 3 — Storage & Upload Pipeline (Day 5–7)

**Spec:** [STAGE_3_PHASE_3_STORAGE_UPLOAD.md](./STAGE_3_PHASE_3_STORAGE_UPLOAD.md) · **Done:** [PHASE_3_COMPLETE.md](./PHASE_3_COMPLETE.md)

16. `packages/storage` — R2/MinIO S3 adapter
17. Presigned upload init + complete endpoints
18. BullMQ + Redis queue: `media` queue
19. Image worker (can run as `apps/worker-media` or embedded consumer): Sharp → thumb + web variants
20. Media metadata records + status lifecycle

### Phase 4 — Guest Experience (Day 7–9)
21. Guest session creation (name entry)
22. Public event page (Next.js SSR `[slug]`)
23. Guest upload page with progress, retry, resume
24. Guest gallery (own uploads, lazy load, pagination)

### Phase 5 — Couple Dashboard (Day 9–11)

Working list: [STAGE_3_PHASE_5_COUPLE_DASHBOARD.md](./STAGE_3_PHASE_5_COUPLE_DASHBOARD.md)

25. Dashboard layout (mobile-first, bottom nav)
26. Event overview (stats, storage meter, activity timeline)
27. Full gallery manager (view all, delete)
28. QR page (display + download PNG)
29. Event settings page (edit names, date, cover)

### Phase 6 — Hardening (Day 11–12)
30. Rate limiting middleware
31. File validation (MIME magic bytes, size)
32. Error handling + API problem details
33. Basic unit + integration tests
34. `docs/STAGE_3_MVP.md` deployment + env documentation

---

## 3. Technical Decisions

### 3.1 Monorepo Structure (Stage 1 Aligned, MVP Trimmed)

```
Momeva/
├── apps/
│   ├── web/              # Next.js 15 — guest pages + dashboard
│   ├── api/              # NestJS — REST API
│   └── worker-media/     # BullMQ consumer — Sharp image processing
├── packages/
│   ├── database/         # Prisma schema + migrations
│   ├── domain/           # Use cases + interfaces (Clean Architecture)
│   ├── shared/           # Zod schemas, constants, types
│   └── storage/          # S3-compatible adapter (R2 / MinIO)
├── docker/
│   └── docker-compose.yml
└── docs/
```

**Decision:** Keep NestJS separate from Next.js (Stage 1 approved). Do not collapse into Next.js API routes — avoids rewrite when adding webhooks, B2B APIs in V1.

**Decision:** Include `worker-media` from day one with BullMQ. Photo processing is async even for MVP — prevents upload timeout on large HEIC files. Not a throwaway pattern.

**Decision:** Omit `worker-ai`, `worker-scheduler`, Stripe, admin app entirely.

### 3.2 Frontend — Next.js 15 (Replace Expo)

| Decision | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | SSR event pages, `[slug]` routing, Stage 1/2 approved |
| Styling | Tailwind CSS v4 + shadcn/ui | Stage 2 design system |
| Data fetching | Server Components for public pages; client for upload | Speed on QR scan |
| Auth in web | HTTP-only cookie storing JWT (couple); separate guest cookie | Security |

Expo code moved to `legacy/expo/` — not deleted.

### 3.3 Authentication

| Actor | MVP mechanism |
|---|---|
| Couple | Magic link via email (Resend); JWT access (15 min) + refresh (7 days) in HTTP-only cookies |
| Guest | POST name → signed guest session cookie (24h, event-scoped) |

**Decision:** Magic link over password for MVP — matches product spec and Stage 2. Password optional deferred to V1.

**Decision:** Use `Resend` for magic link emails even in MVP (no payment emails yet). Local dev uses Mailpit via Docker.

### 3.4 Database — MVP Schema (Prisma)

Core tables only:

- `users` — couple accounts
- `magic_link_tokens` — auth
- `refresh_tokens` — JWT rotation
- `events` — slug, names, date, cover, `privacy_mode` enum, `storage_used_bytes`, `storage_limit_bytes`, `qr_token`, **`status` enum (ACTIVE, EXPIRED, DELETED)**
- `guest_sessions` — first_name, last_name, event_id, token_hash
- `upload_batches` — guest session, upload_session_id
- `media_assets` — **`type` enum (PHOTO, VIDEO, AI_OUTPUT)** — PHOTO only in MVP; status, storage keys, size, guest_session_id
- `media_variants` — thumb, web

**Timestamps on all important tables:** `created_at`, `updated_at`, `deleted_at`

**Soft delete:** `deleted_at` on users, events, guest_sessions, media_assets, upload_batches — supports future expiration, GDPR erasure, recovery.

**Deferred tables:** plans, purchases, ai_jobs, organizations, notifications, audit_logs (add in V1 with migrations)

**Decision:** Include `privacy_mode` enum and `show_guest_names_publicly` boolean on events now — zero cost, avoids migration pain in V1.

**Decision:** Event `status` and media `type` enums fully defined in schema; only ACTIVE events and PHOTO uploads used in MVP code.

### 3.5 Object Storage

| Environment | Storage |
|---|---|
| Production | Cloudflare R2 |
| Local dev | MinIO (S3-compatible API) |

**Storage abstraction (required):**

```typescript
// packages/domain — interface
interface StorageService {
  getPresignedUploadUrl(...): Promise<PresignedUploadUrl>;
  getPresignedDownloadUrl(...): Promise<string>;
  deleteObject(key: string): Promise<void>;
  objectExists(key: string): Promise<boolean>;
}

// packages/storage — S3-compatible implementation (R2 / MinIO)
class S3StorageService implements StorageService { ... }
```

Business logic depends on `StorageService` only — never on AWS SDK directly. Future providers (B2, GCS) swap via DI.

**Path pattern:** `{env}/events/{eventId}/originals/{mediaId}.{ext}`

**Upload flow:** Presigned PUT → client uploads direct → `complete` endpoint → enqueue media job → Sharp variants → status `active`.

**Decision:** API never receives file bytes. Same pattern for V1 video.

### 3.6 Image Processing (MVP)

- **Sharp** in `worker-media`
- Outputs: `thumb` (400px WebP), `web` (2048px max WebP/JPEG)
- Original unchanged in R2
- Gallery serves `thumb`; lightbox serves `web`; couple download serves original via short-lived signed URL

No CDN configuration in MVP — R2 public access via signed URLs only.

### 3.7 API Design (MVP Endpoints)

**Public**
- `GET /v1/public/events/:slug`
- `POST /v1/public/events/:slug/guest-session`
- `POST /v1/public/events/:slug/uploads/init`
- `POST /v1/public/events/:slug/uploads/:batchId/complete`
- `GET /v1/public/events/:slug/gallery`
- `GET /v1/public/events/:slug/media/:id/url`

**Auth**
- `POST /v1/auth/register`
- `POST /v1/auth/magic-link`
- `POST /v1/auth/verify`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`

**Couple (JWT)**
- `POST /v1/events`
- `GET /v1/events`
- `GET /v1/events/:id`
- `PATCH /v1/events/:id`
- `GET /v1/events/:id/media`
- `DELETE /v1/events/:id/media/:mediaId`
- `GET /v1/events/:id/qr`
- `GET /v1/events/:id/stats`

### 3.8 Next.js Routes (MVP)

- `/` — minimal landing (login/create account CTA only; full marketing deferred)
- `/auth/login`, `/auth/verify`
- `/dashboard` — event list or redirect to event
- `/dashboard/events/new`
- `/dashboard/events/[id]` — overview
- `/dashboard/events/[id]/gallery`
- `/dashboard/events/[id]/qr`
- `/dashboard/events/[id]/settings`
- `/[slug]` — public event page
- `/[slug]/upload`
- `/[slug]/gallery`

### 3.9 Security (MVP)

- Event-scoped queries on every media/guest endpoint
- Slug != internal UUID (IDs never in URLs)
- Presigned URL TTL: 15 min upload, 1 hr read
- Rate limits: guest session 10/hr/IP; upload init 30/hr/session
- MIME validation: magic byte check server-side on complete
- CORS restricted to web app origin
- Helmet + HTTPS in production

### 3.10 Logging (MVP)

Structured logging from Phase 0 via `packages/logging`:

| Category | Contents |
|---|---|
| **Request logs** | method, path, status, duration, requestId |
| **Upload errors** | eventId, uploadSessionId, fileName, error code |
| **Worker errors** | jobId, mediaId, queue name, stack trace |

Implementation: Pino (JSON). Full analytics/metrics deferred to V1.

### 3.11 Testing (MVP Minimum)

- Unit: domain use cases (slug validation, privacy filter, storage quota check)
- Integration: auth flow, event CRUD, upload init/complete (mocked storage)
- E2E (Playwright): guest upload → couple sees photo (1 happy path)

---

## 4. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Expo → Next.js migration** | Medium | Move Expo to `legacy/`; clean monorepo; no hybrid stack |
| **R2/MinIO dev parity** | Medium | MinIO in Docker; same S3 SDK; env-driven bucket config |
| **Magic link email dependency** | Medium | Mailpit locally; Resend staging; document API key setup |
| **Scope creep from Stage 2** | High | This document is binding; defer i18n, themes, expiry billing, ZIP |
| **HEIC from iPhones** | Medium | Sharp with heif support; reject if unsupported with clear error |
| **Upload resume complexity** | Medium | MVP: resume within same browser session via sessionStorage + upload_session_id; cross-device resume deferred |
| **No payments = no plan enforcement UX** | Low | Hardcode 20 GB limit; show storage meter; extension UI deferred |
| **Single developer velocity** | Medium | Phased delivery; worker-media last before guest UI needs processing |
| **Guest session abuse** | Medium | Rate limits + per-session caps + IP hashing |
| **Production deployment not in MVP scope** | Low | Document env vars; deploy guide; Vercel + Fly.io in Stage 7 |

---

## 5. Approval Checklist

Before implementation begins, confirm:

- [ ] Turborepo + Next.js + NestJS + worker-media architecture
- [ ] Expo scaffold moved to `legacy/expo/`
- [ ] Cloudflare R2 (prod) + MinIO (local)
- [ ] Magic link auth (Resend + Mailpit local)
- [ ] Hardcoded 20 GB storage limit (no payments)
- [ ] Photos only — no video
- [ ] English only — no i18n
- [ ] Phase order (0 → 6) acceptable

---

**Awaiting approval to begin Phase 0 implementation.**
