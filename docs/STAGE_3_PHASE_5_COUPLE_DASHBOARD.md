# Stage 3 — Phase 5: Couple Dashboard

**Project:** Momeva / Memova  
**Parent stage:** [Stage 3 — MVP Build](./STAGE_3_MVP_PLAN.md)  
**Status:** ✅ Complete — [PHASE_5_COMPLETE.md](./PHASE_5_COMPLETE.md)  
**Depends on:** Phase 4 (Guest UX)  
**Blocks:** Phase 6 (Hardening)

> Working list for Phase 5. Do not change Phase 4 guest flow without explicit approval ([PHASE_4_GUEST_FLOW.md](./PHASE_4_GUEST_FLOW.md)).

---

## MVP checklist (from STAGE_3_MVP_PLAN)

| # | Deliverable | Status | Notes / files |
|---|-------------|--------|---------------|
| 25 | Dashboard layout (mobile-first, bottom nav) | ✅ Done | `dashboard-nav.tsx`, `event-dashboard-shell.tsx` — bottom tabs + desktop sidebar |
| 26 | Event overview (stats, storage meter, activity timeline) | ✅ Done | `events/[id]/page.tsx`, `storage-meter.tsx`, `activity-timeline.tsx` |
| 27 | Full gallery manager (view all, delete) | ✅ Done | `couple-gallery-client.tsx` — view, delete, download originals / batch |
| 28 | QR page (display + download PNG) | ✅ Done | `events/[id]/qr`, `OriginalQrPrintCard`, `EventQrActions` |
| 29 | Event settings (names, date, cover) | ✅ Done | `event-settings-client.tsx` + privacy / guest-name toggles |

### Product locks added during Phase 5

| Rule | Status |
|------|--------|
| 1 account = 1 event (new celebration → new registration) | ✅ Done |
| Admin sees many events; couples do not | ✅ Done (platform admin separate) |
| No server restart from Admin | ✅ Done (health status only) |

---

## Polish steps

| Step | Item | Status | Detail |
|------|------|--------|--------|
| 5.1 | Sidebar / nav copy for 1:1 | ✅ Done | “← All events” → “← Your event” |
| 5.2 | Shared-gallery confirm | ✅ Done | Confirm before `ALL_GUESTS` |
| 5.3 | Couple QR print alignment | ✅ Done | Phase 4 rules; UI verified |
| 5.4 | Phase 5 verification pass | ✅ Done | User confirmed 2026-08-31 |
| 5.5 | `PHASE_5_COMPLETE.md` | ✅ Done | Locked |

### Explicitly out of scope (later)

- Dedicated `/downloads` export center (Stage 2 P1) — gallery download covers MVP
- Billing / AI / account settings pages
- Multi-event couple accounts
- Server restart / infra ops from Admin

### Audit notes (2026-08-31)

Core checklist **25–29 complete**. Optional only:

- Gallery **delete** is lightbox-only (not a grid ×) — still meets MVP
- Couple QR UI uses client base64 PNG; `GET /events/:id/qr/download` exists but unused by UI
- Settings does not edit event `title` (API supports it; names/date/cover are enough for MVP)
- Overview **activity timeline** is gallery-feed backed (not a separate activity API)

---

## Key routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Redirect into sole event, or “Create your event” |
| `/dashboard/events/new` | Create the one event |
| `/dashboard/events/[id]` | Overview |
| `/dashboard/events/[id]/gallery` | Gallery manager |
| `/dashboard/events/[id]/qr` | QR + download PNG / print |
| `/dashboard/events/[id]/settings` | Names, date, cover, privacy |
| `/admin` | Platform admin (not couple Phase 5 UI) |

---

## Progress log

| Date | Change |
|------|--------|
| 2026-08-31 | Checklist created; core 25–29 marked done; remaining polish listed |
| 2026-08-31 | Admin health + alerts shipped (ops, not couple MVP) — commit `2077644` |
| 2026-08-31 | Steps 5.1 + 5.2 done (sidebar copy, shared-gallery confirm) |
| 2026-08-31 | Audit confirmed 25–29 complete; optional notes added to this doc |
| 2026-08-31 | Step 5.3: QR card aligned with Phase 4 (DD.MM.YYYY, helper text, no URL) |
| 2026-08-31 | Step 5.3 UI verified OK (eyebrow / date dots / helper text) |
| 2026-08-31 | Pushed polish + Phase 5 list — commit `7065bff` |
| 2026-08-31 | Step 5.4 started: code checks ✅; couple UI walkthrough pending |
| 2026-08-31 | Soft-deleted stray second local event (`yvucuv-…`); sole event = Demetris & Daniella |
| 2026-08-31 | Steps 5.4 + 5.5 complete — Phase 5 locked |
