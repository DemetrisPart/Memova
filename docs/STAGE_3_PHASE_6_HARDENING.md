# Stage 3 — Phase 6: Hardening

**Project:** Momeva / Memova  
**Parent stage:** [Stage 3 — MVP Build](./STAGE_3_MVP_PLAN.md)  
**Status:** ✅ Complete — [PHASE_6_COMPLETE.md](./PHASE_6_COMPLETE.md)  
**Depends on:** Phase 5 (Couple Dashboard) — [PHASE_5_COMPLETE.md](./PHASE_5_COMPLETE.md)  
**Completion log:** [PHASE_6_COMPLETE.md](./PHASE_6_COMPLETE.md)

> Working list for Phase 6. Do not change Phase 4 guest flow without explicit approval ([PHASE_4_GUEST_FLOW.md](./PHASE_4_GUEST_FLOW.md)).

---

## MVP checklist (from STAGE_3_MVP_PLAN)

| # | Deliverable | Status | Notes |
|---|-------------|--------|-------|
| 30 | Rate limiting middleware | ✅ Done | Global + guest + upload + **auth magic-link/register** (10/hr/IP) |
| 31 | File validation (MIME magic bytes, size) | ✅ Done | Guest uploads + **cover complete** magic-byte sniff |
| 32 | Error handling + API problem details | ✅ Done | RFC 7807 `application/problem+json` via global filter |
| 33 | Basic unit + integration tests | ✅ Done | Domain tests + `scripts/phase6-hardening-verify.mjs` (4/4) |
| 34 | `docs/STAGE_3_MVP.md` + env docs | ✅ Done | Deploy guide + expanded `ENV.md` |

---

## Step-by-step

| Step | Item | Status | Detail |
|------|------|--------|--------|
| 6.1 | Auth magic-link rate limit | ✅ Done | `assertAuthMagicLinkLimit` on register + magic-link |
| 6.2 | Cover upload MIME sniff | ✅ Done | Same sniff + quarantine as guest complete |
| 6.3 | RFC 7807 problem details | ✅ Done | Global filter + web clients read `detail` |
| 6.4 | API / integration smoke tests | ✅ Done | `node scripts/phase6-hardening-verify.mjs` — 4/4 passed |
| 6.5 | `STAGE_3_MVP.md` + `ENV.md` | ✅ Done | Deploy + full env catalogue |
| 6.6 | `PHASE_6_COMPLETE.md` | ✅ Done | Locked 2026-09-01 |

---

## Already in place (pulled forward from Phase 3)

| Area | Where |
|------|--------|
| Global IP rate limit | `apps/api/src/rate-limit/` |
| Guest session / upload limits | `guest-sessions.controller.ts`, `uploads.service.ts` |
| Guest MIME sniff + size | `packages/domain/src/media/mime.utils.ts`, `uploads.service.ts` |
| Domain unit tests | `packages/domain` (`pnpm --filter @momeva/domain test`) |
| Live verify script | `scripts/phase3-hardening-verify.mjs` |
| Exception filter + requestId | `apps/api/src/common/global-exception.filter.ts` |

---

## Progress log

| Date | Change |
|------|--------|
| 2026-09-01 | Phase 6 checklist created; audit: 30 mostly done, 31–33 partial, 34 not started |
| 2026-09-01 | Steps 6.1 + 6.2: auth magic-link rate limit + cover MIME sniff |
| 2026-09-01 | Step 6.3: RFC 7807 problem details (API filter + web parsers) |
| 2026-09-01 | Step 6.4: phase6-hardening-verify.mjs — 4/4 passed |
| 2026-09-01 | Step 6.5: STAGE_3_MVP.md + ENV.md expanded |
| 2026-09-01 | Step 6.6: Phase 6 locked |
