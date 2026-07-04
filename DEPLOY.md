# GitHub + Vercel deploy

Frontend (Portal, Obodon, Hokimiyat) — **Vercel**.  
Backend (NestJS, Postgres, MQTT) — Vercelda ishlamaydi; alohida server kerak (Railway, Render, VPS).

## 1. GitHub

Repo allaqachon push qilingan bo‘lsa, o‘tkazing. Yangi bo‘lsa:

```bash
git init
git add .
git commit -m "Initial commit: Samarqand Aqlli Sugorish MVP"
gh repo create suv-shaxar --public --source=. --remote=origin --push
```

## 2. Vercel — 3 ta loyiha

Bitta GitHub repodan **3 ta Vercel Project** yarating.

### A) Portal (asosiy kirish)

1. [vercel.com/new](https://vercel.com/new) → GitHub repo tanlang
2. **Root Directory:** `apps/portal`
3. Framework: Vite (auto)
4. Environment Variables:

| Name | Value (misol) |
|------|----------------|
| `VITE_OBODON_URL` | `https://obodon-xxx.vercel.app/login` |
| `VITE_HOKIMIYAT_URL` | `https://hokimiyat-xxx.vercel.app/login` |

Avval Obodon va Hokimiyatni deploy qilib URL oling, keyin Portal env ni yangilang.

### B) Obodonlashtirish (operator)

1. New Project → xuddi shu repo
2. **Root Directory:** `apps/operator`
3. Environment Variables:

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://YOUR-API-HOST/api` |

### C) Hokimiyat (monitoring)

1. New Project → xuddi shu repo
2. **Root Directory:** `apps/monitoring`
3. Environment Variables:

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://YOUR-API-HOST/api` |

## 3. Backend (majburiy)

API, Postgres+PostGIS, Redis, MQTT, MinIO Vercelda ishlamaydi.

Variantlar:
- **VPS (O‘zbekiston server)** — `docker compose up` + `npm run start` API
- Railway / Render — Postgres + Node API

API CORS:

```
CORS_ORIGINS=https://portal-xxx.vercel.app,https://obodon-xxx.vercel.app,https://hokimiyat-xxx.vercel.app
```

## 4. Tekshirish

1. Portal ochiladi → ikkita karta
2. Obodon login: `+998901111111` / `Admin123!` (seed qilingan DB)
3. Hokimiyat login: `+998903333333` / `Admin123!`

## Eslatma

Lokal demo uchun API `localhost:3000`. Productionda `VITE_API_URL` ni haqiqiy backend manziliga qo‘ying, aks holda login ishlamaydi.
