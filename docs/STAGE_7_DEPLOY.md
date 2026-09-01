# Stage 7 — Production Deploy

**Project:** Momeva / Memova  
**Depends on:** Stage 3 MVP (Phases 0–6) — [STAGE_3_MVP.md](./STAGE_3_MVP.md)  
**Status:** In progress  
**Architecture target:** [STAGE_1_ARCHITECTURE.md](./STAGE_1_ARCHITECTURE.md) §9

> Working list for production deploy. Do not change Phase 4 guest flow without approval.

---

## Target topology

| Component | Platform | Status |
|-----------|----------|--------|
| Web | Vercel (EU) | ⬜ |
| API | Fly.io | 🔄 `fly.toml` ready — deploy when secrets + DB exist |
| Worker media | Fly.io | 🔄 `fly.toml` ready — deploy when secrets + Redis exist |
| Postgres | Neon (EU) | ⬜ |
| Redis | Upstash | ⬜ |
| Object storage | Cloudflare R2 | ⬜ |
| Email | Resend | ⬜ |
| CI | GitHub Actions | ✅ Basic CI (step 7.2) |

---

## Step-by-step

| Step | Item | Status | Detail |
|------|------|--------|--------|
| 7.1 | Docker images for API + worker | ✅ Done | `apps/api/Dockerfile`, `apps/worker-media/Dockerfile` |
| 7.2 | GitHub Actions CI | ✅ Done | `.github/workflows/ci.yml` — install, Prisma, domain tests, typecheck |
| 7.3 | Fly.io app configs | ✅ Done | `apps/api/fly.toml`, `apps/worker-media/fly.toml` (FRA) |
| 7.4 | Vercel web project notes | 🔄 Next | Env mapping + build command for monorepo |
| 7.5 | Staging env checklist | ⬜ Pending | Neon + Upstash + R2 + Resend wired |
| 7.6 | First staging deploy | ⬜ Pending | Manual smoke (guest upload + magic link) |
| 7.7 | `STAGE_7` / go-live lock | ⬜ Pending | Only after staging OK |

### Explicitly later (not this stage’s MVP)

- OWASP ZAP / k6 load (Stage 1 deferred)
- Terraform / full IaC
- Stripe payments
- Multi-region

---

## Progress log

| Date | Change |
|------|--------|
| 2026-09-01 | Stage 7 checklist created after Phase 6 lock |
| 2026-09-01 | Steps 7.1–7.2: Dockerfiles + GitHub Actions CI |
| 2026-09-01 | Step 7.3: Fly.toml for API + worker (region `fra`) |

---

## Fly deploy (when accounts + secrets exist)

```bash
# once
fly auth login
fly apps create momeva-api
fly apps create momeva-worker-media

# set secrets on each app (examples — use real values)
# fly secrets set -a momeva-api DATABASE_URL=... REDIS_URL=... JWT_ACCESS_SECRET=...

fly deploy -c apps/api/fly.toml --dockerfile apps/api/Dockerfile
fly deploy -c apps/worker-media/fly.toml --dockerfile apps/worker-media/Dockerfile
```

