# Staging environment checklist (Stage 7.5)

Fill this when creating cloud accounts. Do **not** commit real secrets — only mark status here or keep secrets in Fly/Vercel dashboards.

Related: [STAGE_7_DEPLOY.md](./STAGE_7_DEPLOY.md) · [VERCEL_WEB.md](./VERCEL_WEB.md) · [ENV.md](./ENV.md)

---

## 1. Accounts

| Service | Purpose | Created? | Notes |
|---------|---------|----------|--------|
| Neon | Postgres (EU) | ⬜ | Create DB + connection string |
| Upstash | Redis | ⬜ | For BullMQ + rate limits |
| Cloudflare R2 | Object storage | ⬜ | Bucket + API token |
| Resend | Magic-link email | ⬜ | Domain or onboarding domain |
| Fly.io | API + worker | ⬜ | Apps `momeva-api`, `momeva-worker-media` |
| Vercel | Next.js web | ⬜ | See [VERCEL_WEB.md](./VERCEL_WEB.md) |

---

## 2. Wire secrets (Fly API)

```bash
fly secrets set -a momeva-api \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="redis://..." \
  JWT_ACCESS_SECRET="..." \
  JWT_REFRESH_SECRET="..." \
  STORAGE_ENDPOINT="https://....r2.cloudflarestorage.com" \
  STORAGE_REGION="auto" \
  STORAGE_BUCKET="momeva-staging" \
  STORAGE_ACCESS_KEY_ID="..." \
  STORAGE_SECRET_ACCESS_KEY="..." \
  STORAGE_FORCE_PATH_STYLE="true" \
  WEB_APP_URL="https://….vercel.app" \
  PUBLIC_EVENT_BASE_URL="https://….vercel.app" \
  SMTP_HOST="smtp.resend.com" \
  SMTP_PORT="465" \
  SMTP_FROM="Momeva <noreply@yourdomain.com>"
# plus Resend SMTP user/pass or provider-specific vars you use
```

Same storage + Redis (+ `DATABASE_URL` if worker needs Prisma) on **worker**:

```bash
fly secrets set -a momeva-worker-media \
  DATABASE_URL="..." \
  REDIS_URL="..." \
  STORAGE_ENDPOINT="..." \
  STORAGE_REGION="auto" \
  STORAGE_BUCKET="momeva-staging" \
  STORAGE_ACCESS_KEY_ID="..." \
  STORAGE_SECRET_ACCESS_KEY="..." \
  STORAGE_FORCE_PATH_STYLE="true" \
  APP_ENV="production" \
  NODE_ENV="production"
```

Then:

```bash
# migrate once against Neon
DATABASE_URL="postgresql://..." pnpm db:migrate:deploy

fly deploy -c apps/api/fly.toml --dockerfile apps/api/Dockerfile
fly deploy -c apps/worker-media/fly.toml --dockerfile apps/worker-media/Dockerfile
```

Health: `https://momeva-api.fly.dev/v1/health`

---

## 3. Wire Vercel

See [VERCEL_WEB.md](./VERCEL_WEB.md). Minimum:

| Var | Value |
|-----|--------|
| `API_URL` | `https://momeva-api.fly.dev` |
| `WEB_APP_URL` | your Vercel URL |

---

## 4. Smoke (step 7.6)

- [ ] `GET /v1/health` → database ok, queue ok  
- [ ] Guest open `/<slug>` on Vercel  
- [ ] Name → upload photo → appears in gallery  
- [ ] Couple magic link → dashboard  
- [ ] Cover upload + settings save  
- [ ] Admin (after promote) opens `/admin`

---

## Blockers until accounts exist

Code/config for Docker, Fly, Vercel, and CI is ready. **Staging cannot go live on the internet until the table in §1 is filled and secrets are set.**
