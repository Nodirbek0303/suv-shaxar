import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { UserRole } from '@suv/shared';

/** Approximate district polygons around Samarkand (simplified for MVP demo). */
const DISTRICTS = [
  {
    name: 'Samarqand shahri',
    level: 'shahar',
    ring: [
      [66.9, 39.62],
      [67.02, 39.62],
      [67.02, 39.7],
      [66.9, 39.7],
      [66.9, 39.62],
    ],
  },
  {
    name: 'Urgut tumani',
    level: 'tuman',
    ring: [
      [67.15, 39.35],
      [67.35, 39.35],
      [67.35, 39.5],
      [67.15, 39.5],
      [67.15, 39.35],
    ],
  },
  {
    name: 'Pastdargʻom tumani',
    level: 'tuman',
    ring: [
      [66.65, 39.55],
      [66.85, 39.55],
      [66.85, 39.72],
      [66.65, 39.72],
      [66.65, 39.55],
    ],
  },
  {
    name: 'Jomboy tumani',
    level: 'tuman',
    ring: [
      [67.05, 39.65],
      [67.25, 39.65],
      [67.25, 39.8],
      [67.05, 39.8],
      [67.05, 39.65],
    ],
  },
  {
    name: 'Tayloq tumani',
    level: 'tuman',
    ring: [
      [67.0, 39.5],
      [67.2, 39.5],
      [67.2, 39.62],
      [67.0, 39.62],
      [67.0, 39.5],
    ],
  },
];

function ringToWkt(ring: number[][]): string {
  const coords = ring.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `POLYGON((${coords}))`;
}

function lineWkt(centerLng: number, centerLat: number, index: number): string {
  const offset = index * 0.008;
  const a = `${centerLng + offset} ${centerLat}`;
  const b = `${centerLng + offset + 0.02} ${centerLat + 0.01}`;
  const c = `${centerLng + offset + 0.04} ${centerLat}`;
  return `LINESTRING(${a}, ${b}, ${c})`;
}

async function seed() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://suv:suv_secret@localhost:5433/suv_shaxar';
  const pool = new Pool({ connectionString: databaseUrl });

  console.log('Seeding database...');

  const existing = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  if (existing.rows[0].c > 0) {
    console.log('Database already seeded, skipping.');
    await pool.end();
    return;
  }

  const viloyat = await pool.query(
    `INSERT INTO regions (name, parent_id, level, boundary)
     VALUES ($1, NULL, 'viloyat', ST_GeomFromText($2, 4326))
     RETURNING id`,
    [
      'Samarqand viloyati',
      ringToWkt([
        [66.4, 39.2],
        [67.5, 39.2],
        [67.5, 40.0],
        [66.4, 40.0],
        [66.4, 39.2],
      ]),
    ],
  );
  const viloyatId = viloyat.rows[0].id as string;

  const districtIds: { id: string; name: string; ring: number[][] }[] = [];
  for (const d of DISTRICTS) {
    const res = await pool.query(
      `INSERT INTO regions (name, parent_id, level, boundary)
       VALUES ($1, $2, $3, ST_GeomFromText($4, 4326))
       RETURNING id`,
      [d.name, viloyatId, d.level, ringToWkt(d.ring)],
    );
    districtIds.push({ id: res.rows[0].id, name: d.name, ring: d.ring });
  }

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, region_id)
     VALUES
       ($1, $2, $3, $4, $5),
       ($6, $7, $3, $8, $5),
       ($9, $10, $3, $11, $5)`,
    [
      'Obodon Admin',
      '+998901111111',
      passwordHash,
      UserRole.OBODONLASHTIRISH_ADMIN,
      viloyatId,
      'Obodon Operator',
      '+998902222222',
      UserRole.OBODONLASHTIRISH_OPERATOR,
      'Hokimiyat Viewer',
      '+998903333333',
      UserRole.HOKIMIYAT_VIEWER,
    ],
  );

  const plantTypes = ['Gulzor', 'Daraxtzor', 'Maydon', 'Park', 'Yoʻlak'];
  let lineCounter = 1;

  for (const district of districtIds) {
    const [lng0, lat0] = district.ring[0];
    const centerLng = lng0 + 0.05;
    const centerLat = lat0 + 0.05;

    for (let i = 0; i < 3; i++) {
      const code = `SAM-REG-${String(lineCounter).padStart(3, '0')}-L${String(i + 1).padStart(3, '0')}`;
      const lineRes = await pool.query(
        `INSERT INTO irrigation_lines
           (code, region_id, geometry, plant_type, irrigation_type, length_meters, installed_date, status, irrigation_mode, irrigation_on)
         VALUES
           ($1, $2, ST_GeomFromText($3, 4326), $4, 'drip', $5, CURRENT_DATE - ($6 || ' days')::interval, 'active', 'auto', $7)
         RETURNING id`,
        [
          code,
          district.id,
          lineWkt(centerLng, centerLat, i),
          plantTypes[(lineCounter + i) % plantTypes.length],
          120 + i * 40,
          String(30 + i * 10),
          i === 0,
        ],
      );
      const lineId = lineRes.rows[0].id as string;

      for (const [type, serial] of [
        ['soil_moisture', `${code}-SM`],
        ['water_flow', `${code}-WF`],
        ['temperature', `${code}-TP`],
      ] as const) {
        await pool.query(
          `INSERT INTO sensors (line_id, type, serial_number)
           VALUES ($1, $2, $3)`,
          [lineId, type, serial],
        );
      }

      // Seed some historical aggregated stats for monitoring panel
      for (let day = 14; day >= 0; day--) {
        const moisture = 40 + Math.random() * 30;
        const health = Math.min(100, Math.max(20, moisture + Math.random() * 20));
        const used = 800 + Math.random() * 400;
        const saved = used * (0.25 + Math.random() * 0.2);
        await pool.query(
          `INSERT INTO aggregated_stats
             (region_id, line_id, period_type, period_start, water_used_liters, water_saved_liters, avg_soil_moisture, plant_health_score, line_count)
           VALUES
             ($1, $2, 'daily', date_trunc('day', NOW()) - ($3 || ' days')::interval, $4, $5, $6, $7, 1)
           ON CONFLICT DO NOTHING`,
          [district.id, lineId, String(day), used, saved, moisture, health],
        );
      }

      lineCounter++;
    }

    // Region-level daily aggregates
    for (let day = 14; day >= 0; day--) {
      await pool.query(
        `INSERT INTO aggregated_stats
           (region_id, line_id, period_type, period_start, water_used_liters, water_saved_liters, avg_soil_moisture, plant_health_score, line_count)
         SELECT
           $1, NULL, 'daily', date_trunc('day', NOW()) - ($2 || ' days')::interval,
           COALESCE(SUM(water_used_liters), 0),
           COALESCE(SUM(water_saved_liters), 0),
           AVG(avg_soil_moisture),
           AVG(plant_health_score),
           COUNT(*)::int
         FROM aggregated_stats
         WHERE region_id = $1 AND line_id IS NOT NULL
           AND period_type = 'daily'
           AND period_start = date_trunc('day', NOW()) - ($2 || ' days')::interval
         ON CONFLICT DO NOTHING`,
        [district.id, String(day)],
      );
    }
  }

  console.log('Seed completed.');
  console.log('Demo accounts (password: Admin123!):');
  console.log('  Operator admin: +998901111111');
  console.log('  Operator user:  +998902222222');
  console.log('  Hokimiyat:      +998903333333');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
