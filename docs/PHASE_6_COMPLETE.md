# Phase 6 — Hardening Complete

**Working list:** [STAGE_3_PHASE_6_HARDENING.md](./STAGE_3_PHASE_6_HARDENING.md)  
**Parent stage:** [Stage 3 — MVP Build](./STAGE_3_MVP_PLAN.md)  
**Deploy / env:** [STAGE_3_MVP.md](./STAGE_3_MVP.md) · [ENV.md](./ENV.md)  
**Status:** ✅ Complete — locked 2026-09-01  
**Depends on:** Phase 5 (Couple Dashboard)

Do not change Phase 4 guest flow without explicit approval ([PHASE_4_GUEST_FLOW.md](./PHASE_4_GUEST_FLOW.md)).

---

## MVP delivered (30–34)

| # | Deliverable | Notes |
|---|-------------|--------|
| 30 | Rate limiting | Global IP, guest session, upload init/complete, **auth magic-link/register** |
| 31 | File validation | Guest + **cover** MIME magic-byte sniff; size caps |
| 32 | Error handling | RFC 7807 `application/problem+json` (`detail`, `requestId`, …) |
| 33 | Tests | Domain unit tests + `scripts/phase6-hardening-verify.mjs` |
| 34 | Deploy / env docs | `STAGE_3_MVP.md` + expanded `ENV.md` |

## Verify

```bash
node scripts/phase6-hardening-verify.mjs
# Last local run: 4/4 passed (2026-09-01)
```

## Next

Stage 3 MVP hardening is locked. Remaining product work is outside this checklist (billing, PWA install, multi-region, etc. — see Stage 1 / later stages).
