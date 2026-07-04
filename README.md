# Samarqand Aqlli Sug'orish va Monitoring Platformasi

MVP monorepo: portal + ikkita frontend panel, bitta NestJS backend, PostgreSQL+PostGIS, MQTT simulyator.

**Deploy:** [DEPLOY.md](./DEPLOY.md) — GitHub va Vercel yo‘riqnomasi.

## Arxitektura

| Komponent | URL / port | Vazifa |
|-----------|------------|--------|
| **Portal** (`apps/portal`) | http://localhost:5170 | Panel tanlash (Obodon / Hokimiyat) |
| **Operator panel** (`apps/operator`) | http://localhost:5173 | Obodonlashtirish — to'liq boshqaruv |
| **Monitoring panel** (`apps/monitoring`) | http://localhost:5174 | Hokimiyat — faqat ko'rish / hisobot |
| **API** (`apps/api`) | http://localhost:3000/api | Auth, RBAC, CRUD, agregatsiya |
| **Simulator** (`apps/simulator`) | — | MQTT orqali soxta sensor oqimi |
| PostgreSQL + PostGIS | 5433 | Geo + asosiy ma'lumotlar |
| Redis | 6379 | Cache / navbat (tayyor) |
| Mosquitto MQTT | 1883 | IoT broker |
| MinIO | 9000 | Dizayn fayllari (S3) |

**Muhim:** Hokimiyat paneli faqat `/api/monitoring/*` va `/api/reports/*` orqali **agregatsiya** qilingan ma'lumotni oladi — xom `sensor_readings` ochiq emas.

## Tezkor ishga tushirish

### 1. Talablar

- Node.js 20+
- Docker Desktop

### 2. Infratuzilma

```bash
docker compose up -d
```

### 3. O'rnatish va migratsiya

```bash
npm install
npm run db:migrate
npm run db:seed
```

### 4. Servislarni ishga tushirish

Alohida terminallarda:

```bash
npm run dev:api
npm run dev:operator
npm run dev:monitoring
npm run dev:simulator
```

## Demo akkauntlar

Parol barcha uchun: `Admin123!`

| Panel | Telefon | Rol |
|-------|---------|-----|
| Operator | `+998901111111` | `obodonlashtirish_admin` |
| Operator | `+998902222222` | `obodonlashtirish_operator` |
| Hokimiyat | `+998903333333` | `hokimiyat_viewer` |

## Google Maps

`.env` faylida:

```env
VITE_GOOGLE_MAPS_API_KEY=your-key-here
```

Kalit bo'lmasa ham panel ishlaydi — xarita o'rniga fallback ro'yxat ko'rsatiladi.

## Asosiy API yo'llari

### Umumiy
- `POST /api/auth/login` — `{ phone, password, panel: "operator" | "monitoring" }`
- `GET /api/regions`, `GET /api/regions/:id/lines`

### Operator (yozish ruxsati)
- `CRUD /api/lines`
- `POST /api/lines/:id/irrigation`
- `GET /api/lines/:id/history` — xom sensor tarixi
- `CRUD /api/tickets`, `/api/users`
- `POST /api/storage/upload`

### Hokimiyat (faqat o'qish)
- `GET /api/monitoring/overview`
- `GET /api/monitoring/regions`
- `GET /api/monitoring/trends`
- `GET /api/reports/excel`, `GET /api/reports/pdf`

### Real-vaqt
- WebSocket: `ws://localhost:3000/realtime` — event: `sensor:reading`
- MQTT topic: `sensors/{line_code}/{sensor_type}`

## Loyiha tuzilmasi

```
apps/
  api/          NestJS backend
  operator/     Obodonlashtirish React panel
  monitoring/   Hokimiyat React panel
  simulator/    IoT sensor emulyatori
packages/
  shared/       Umumiy tiplar va yordamchilar
infra/          DB init, Mosquitto config
```

## MVP qamrovi

- [x] Auth + JWT + refresh + RBAC (panel bo'yicha login)
- [x] Hudud / liniya CRUD, audit log
- [x] Xarita moduli (Google Maps + fallback)
- [x] MQTT simulyator + WebSocket jonli oqim
- [x] Agregatsiya (cron) + monitoring API
- [x] Hisobot / grafiklar (ECharts) + PDF/Excel eksport
- [x] Texnik xizmat tiketlari
- [x] Dizayn fayl yuklash (MinIO)
- [x] Docker Compose

## Keyingi bosqichlar

Real IoT qurilmalar, mobil ilova, SMS/Telegram ogohlantirish, ML optimallashtirish, multi-tenant (boshqa viloyatlar).
