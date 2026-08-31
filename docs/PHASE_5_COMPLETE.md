# Phase 5 — Couple Dashboard Complete

**Working list:** [STAGE_3_PHASE_5_COUPLE_DASHBOARD.md](./STAGE_3_PHASE_5_COUPLE_DASHBOARD.md)  
**Parent stage:** [Stage 3 — MVP Build](./STAGE_3_MVP_PLAN.md)  
**Status:** ✅ Complete — locked 2026-08-31  
**Depends on:** Phase 4 (Guest UX)  
**Next:** Phase 6 (Hardening)

Do not change Phase 4 guest flow without explicit approval ([PHASE_4_GUEST_FLOW.md](./PHASE_4_GUEST_FLOW.md)).

---

## MVP delivered (25–29)

| # | Deliverable | Notes |
|---|-------------|--------|
| 25 | Dashboard layout | Mobile bottom nav + desktop sidebar |
| 26 | Event overview | Stats, storage meter, activity timeline |
| 27 | Gallery manager | View all, lightbox delete, download / Save all |
| 28 | QR page | Display, Download PNG, Print |
| 29 | Event settings | Names, date, cover, privacy, guest-name toggle |

## Product locks

| Rule | Detail |
|------|--------|
| 1 account = 1 event | API `ConflictException`; dashboard redirects to sole event |
| Couple ≠ Admin | Platform admin is separate (`/admin`) |
| Guest ≠ Couple | Guest URL `/{slug}`; couple uses `/dashboard` |

## Key routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Redirect into sole event, or create first |
| `/dashboard/events/[id]` | Overview |
| `/dashboard/events/[id]/gallery` | Gallery |
| `/dashboard/events/[id]/qr` | QR & sharing |
| `/dashboard/events/[id]/settings` | Event settings |

## Test event (dev)

- Slug: `wedding-3-oct-2026` (Demetris & Daniella)
- Couple: `/auth/login?next=/dashboard`
- Guest: `/wedding-3-oct-2026`
- See [DEV_URLS.md](./DEV_URLS.md)

## Out of scope (later)

- Dedicated export center (`/downloads`)
- Billing / AI / multi-event couple accounts
- Server restart from Admin

## Next: Phase 6 — Hardening

Rate limiting, file validation, error handling, tests, deploy/env docs.
