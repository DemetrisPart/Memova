# Stage 3 — Phase 5: Couple Dashboard

**Project:** Momeva / Memova  
**Parent stage:** [Stage 3 — MVP Build](./STAGE_3_MVP_PLAN.md)  
**Status:** In progress — core deliverables largely shipped; polish + lock remaining  
**Depends on:** Phase 4 (Guest UX)  
**Blocks:** Phase 6 (Hardening)

> Working list for Phase 5. Update this file as each step lands. Do not change Phase 4 guest flow without explicit approval ([PHASE_4_GUEST_FLOW.md](./PHASE_4_GUEST_FLOW.md)).

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

## Remaining polish (step-by-step)

Work these in order. Mark ✅ when done and note the date.

| Step | Item | Status | Detail |
|------|------|--------|--------|
| 5.1 | Sidebar / nav copy for 1:1 | ✅ Done | “← All events” → “← Your event” in `dashboard-nav.tsx` |
| 5.2 | Shared-gallery confirm | ✅ Done | `window.confirm` before switching to `ALL_GUESTS` in settings |
| 5.3 | Couple QR print alignment | ✅ Done | Verified OK on UI: eyebrow, `03.10.2026`, helper text (no URL) — 2026-08-31 |
| 5.4 | Phase 5 verification pass | 🔄 In progress | Checklist below — QR UI already OK; couple tabs need quick walkthrough |
| 5.5 | `PHASE_5_COMPLETE.md` | ⬜ Pending | Lock when polish verified |

### 5.4 Verification checklist

Test event: `wedding-3-oct-2026`  
LAN: `http://192.168.0.103:3000` · Preview: `http://localhost:3000`

| Area | Check | Status |
|------|-------|--------|
| Code | Bottom nav Home / Gallery / QR / Settings wired | ✅ Code |
| Code | Overview: stats + storage meter + activity timeline | ✅ Code |
| Code | Gallery: list + lightbox delete + download | ✅ Code |
| Code | Settings: names / date / cover / privacy confirm | ✅ Code |
| Code | 1 account = 1 event (API conflict + dashboard redirect) | ✅ Code |
| UI | Guest QR: Scan to share / `DD.MM.YYYY` / helper (no URL) | ✅ User 2026-08-31 |
| UI | Couple Home overview loads | ⬜ You |
| UI | Couple Gallery opens + lightbox | ⬜ You |
| UI | Couple QR matches guest QR look | ⬜ You |
| UI | Couple Settings save + shared-gallery confirm | ⬜ You |
| UI | Bottom nav works on phone / Mobile Preview | ⬜ You |

**Couple walkthrough URLs (after login):**

- Preview: http://localhost:3000/dashboard  
- Phone: http://192.168.0.103:3000/dashboard  

Then tap **Home → Gallery → QR → Settings**.

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
