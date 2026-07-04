# GitHub + Vercel (to‘liq)

## Frontend (3 project)

Repo: https://github.com/Nodirbek0303/suv-shaxar

| Project | Root Directory | Production URL (misol) |
|---------|----------------|------------------------|
| Portal | `apps/portal` | `https://suv-shaxar-portal.vercel.app` |
| Obodon | `apps/operator` | `https://suv-shaxar-obodon.vercel.app` |
| Hokimiyat | `apps/monitoring` | `https://suv-shaxar-hokimiyat.vercel.app` |
| **API** | `apps/api` | `https://suv-shaxar-api.vercel.app` |

### Portal env
```
VITE_OBODON_URL=https://<obodon-project>.vercel.app/login
VITE_HOKIMIYAT_URL=https://<hokimiyat-project>.vercel.app/login
```

### Obodon / Hokimiyat env
```
VITE_API_URL=https://suv-shaxar-api.vercel.app/api
```

(Agar qo‘yilmasa ham production build shu API manzilini ishlatadi.)

## API project (`apps/api`)

1. Vercel → New Project → `suv-shaxar` repo
2. **Root Directory:** `apps/api`
3. Environment Variables:

| Name | Qiymat |
|------|--------|
| `DATABASE_URL` | Neon/Supabase Postgres connection string (SSL) |
| `JWT_SECRET` | uzun random string |
| `JWT_REFRESH_SECRET` | uzun random string |
| `CORS_ORIGINS` | portal, obodon, hokimiyat Vercel URL lari (vergul bilan) |
| `DISABLE_BACKGROUND_SERVICES` | `true` (MQTT/WS o‘chiq — Vercel serverless) |

### Postgres (majburiy)

Vercelda DB yo‘q. Bepul variant:

1. [neon.tech](https://neon.tech) → Create project
2. Connection string ni `DATABASE_URL` ga qo‘ying
3. Migratsiya (lokal yoki bir marta):

```bash
$env:DATABASE_URL="postgresql://...@...neon.tech/neondb?sslmode=require"
npm run build -w @suv/shared
npm run db:migrate
npm run db:seed
```

### Tekshirish

```
https://suv-shaxar-api.vercel.app/api/health
```

Javob: `{ "status": "ok", "database": "ok", ... }`

## Cheklovlar (Vercel serverless)

- MQTT / WebSocket / cron **ishlamaydi** (faqat REST API)
- Real-time sensor oqimi faqat lokalda
- Productionda login, CRUD, hisobotlar, monitoring REST orqali ishlaydi
