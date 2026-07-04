import * as bcrypt from 'bcryptjs';
import { one, query } from './db';

/** Create schema + demo data if DB is empty (first Vercel deploy). */
export async function ensureDatabaseReady() {
  await query(`CREATE EXTENSION IF NOT EXISTS postgis`);
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await query(`
    DO $$ BEGIN
      CREATE TYPE region_level AS ENUM ('viloyat','tuman','shahar','mahalla');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await query(`
    DO $$ BEGIN
      CREATE TYPE line_status AS ENUM ('active','maintenance','inactive');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await query(`
    DO $$ BEGIN
      CREATE TYPE sensor_type AS ENUM ('soil_moisture','water_flow','temperature');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await query(`
    DO $$ BEGIN
      CREATE TYPE period_type AS ENUM ('hourly','daily','monthly');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await query(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM (
        'obodonlashtirish_admin','obodonlashtirish_operator','hokimiyat_viewer'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await query(`
    DO $$ BEGIN
      CREATE TYPE ticket_status AS ENUM ('open','in_progress','resolved');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await query(`
    DO $$ BEGIN
      CREATE TYPE irrigation_mode AS ENUM ('manual','auto');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS regions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      parent_id UUID REFERENCES regions(id) ON DELETE SET NULL,
      level region_level NOT NULL,
      boundary GEOMETRY(Polygon, 4326),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(32) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role user_role NOT NULL,
      region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS irrigation_lines (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(64) NOT NULL UNIQUE,
      region_id UUID NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
      geometry GEOMETRY(LineString, 4326) NOT NULL,
      plant_type VARCHAR(128) NOT NULL,
      irrigation_type VARCHAR(64) NOT NULL DEFAULT 'drip',
      length_meters DOUBLE PRECISION NOT NULL DEFAULT 0,
      installed_date DATE,
      status line_status NOT NULL DEFAULT 'active',
      irrigation_mode irrigation_mode NOT NULL DEFAULT 'auto',
      irrigation_on BOOLEAN NOT NULL DEFAULT FALSE,
      design_plan_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sensors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      line_id UUID NOT NULL REFERENCES irrigation_lines(id) ON DELETE CASCADE,
      type sensor_type NOT NULL,
      serial_number VARCHAR(128) NOT NULL,
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(line_id, type)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id BIGSERIAL PRIMARY KEY,
      sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
      value DOUBLE PRECISION NOT NULL,
      unit VARCHAR(32) NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS aggregated_stats (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
      line_id UUID REFERENCES irrigation_lines(id) ON DELETE CASCADE,
      period_type period_type NOT NULL,
      period_start TIMESTAMPTZ NOT NULL,
      water_used_liters DOUBLE PRECISION NOT NULL DEFAULT 0,
      water_saved_liters DOUBLE PRECISION NOT NULL DEFAULT 0,
      avg_soil_moisture DOUBLE PRECISION,
      plant_health_score DOUBLE PRECISION,
      line_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE NULLS NOT DISTINCT (region_id, line_id, period_type, period_start)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS maintenance_tickets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      line_id UUID NOT NULL REFERENCES irrigation_lines(id) ON DELETE CASCADE,
      reported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      status ticket_status NOT NULL DEFAULT 'open',
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(64) NOT NULL,
      entity_type VARCHAR(64) NOT NULL,
      entity_id UUID,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existing = await one<{ c: string }>('SELECT COUNT(*)::text AS c FROM users');
  if (Number(existing?.c || 0) > 0) return;

  const viloyat = await one<{ id: string }>(
    `INSERT INTO regions (name, parent_id, level, boundary)
     VALUES ('Samarqand viloyati', NULL, 'viloyat',
       ST_GeomFromText('POLYGON((66.4 39.2, 67.5 39.2, 67.5 40.0, 66.4 40.0, 66.4 39.2))', 4326))
     RETURNING id`,
  );

  const districts = [
    { name: 'Samarqand shahri', level: 'shahar', ring: 'POLYGON((66.9 39.62, 67.02 39.62, 67.02 39.7, 66.9 39.7, 66.9 39.62))' },
    { name: 'Urgut tumani', level: 'tuman', ring: 'POLYGON((67.15 39.35, 67.35 39.35, 67.35 39.5, 67.15 39.5, 67.15 39.35))' },
    { name: 'Pastdargʻom tumani', level: 'tuman', ring: 'POLYGON((66.65 39.55, 66.85 39.55, 66.85 39.72, 66.65 39.72, 66.65 39.55))' },
    { name: 'Jomboy tumani', level: 'tuman', ring: 'POLYGON((67.05 39.65, 67.25 39.65, 67.25 39.8, 67.05 39.8, 67.05 39.65))' },
    { name: 'Tayloq tumani', level: 'tuman', ring: 'POLYGON((67.0 39.5, 67.2 39.5, 67.2 39.62, 67.0 39.62, 67.0 39.5))' },
  ];

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  await query(
    `INSERT INTO users (full_name, phone, password_hash, role, region_id) VALUES
      ('Obodon Admin', '+998901111111', $1, 'obodonlashtirish_admin', $2),
      ('Obodon Operator', '+998902222222', $1, 'obodonlashtirish_operator', $2),
      ('Hokimiyat Viewer', '+998903333333', $1, 'hokimiyat_viewer', $2)`,
    [passwordHash, viloyat!.id],
  );

  let n = 1;
  for (const d of districts) {
    const district = await one<{ id: string }>(
      `INSERT INTO regions (name, parent_id, level, boundary)
       VALUES ($1, $2, $3::region_level, ST_GeomFromText($4, 4326))
       RETURNING id`,
      [d.name, viloyat!.id, d.level, d.ring],
    );

    for (let i = 0; i < 3; i++) {
      const code = `SAM-REG-${String(n).padStart(3, '0')}-L${String(i + 1).padStart(3, '0')}`;
      const lng = 66.9 + n * 0.02;
      const lat = 39.6 + i * 0.01;
      const line = await one<{ id: string }>(
        `INSERT INTO irrigation_lines
           (code, region_id, geometry, plant_type, length_meters, installed_date, status, irrigation_mode, irrigation_on)
         VALUES
           ($1, $2, ST_GeomFromText($3, 4326), $4, $5, CURRENT_DATE, 'active', 'auto', $6)
         RETURNING id`,
        [
          code,
          district!.id,
          `LINESTRING(${lng} ${lat}, ${lng + 0.02} ${lat + 0.01}, ${lng + 0.04} ${lat})`,
          ['Gulzor', 'Daraxtzor', 'Park'][i],
          120 + i * 40,
          i === 0,
        ],
      );

      for (const [type, serial] of [
        ['soil_moisture', `${code}-SM`],
        ['water_flow', `${code}-WF`],
        ['temperature', `${code}-TP`],
      ] as const) {
        const sensor = await one<{ id: string }>(
          `INSERT INTO sensors (line_id, type, serial_number, last_seen_at)
           VALUES ($1, $2, $3, NOW()) RETURNING id`,
          [line!.id, type, serial],
        );
        await query(
          `INSERT INTO sensor_readings (sensor_id, value, unit, recorded_at)
           VALUES ($1, $2, $3, NOW())`,
          [
            sensor!.id,
            type === 'soil_moisture' ? 55 : type === 'water_flow' ? 40 : 28,
            type === 'soil_moisture' ? '%' : type === 'water_flow' ? 'L/h' : '°C',
          ],
        );
      }

      for (let day = 14; day >= 0; day--) {
        const moisture = 40 + Math.random() * 30;
        const health = Math.min(100, Math.max(20, moisture + Math.random() * 20));
        const used = 800 + Math.random() * 400;
        const saved = used * 0.3;
        await query(
          `INSERT INTO aggregated_stats
             (region_id, line_id, period_type, period_start, water_used_liters, water_saved_liters, avg_soil_moisture, plant_health_score, line_count)
           VALUES ($1, $2, 'daily', date_trunc('day', NOW()) - ($3 || ' days')::interval, $4, $5, $6, $7, 1)
           ON CONFLICT DO NOTHING`,
          [district!.id, line!.id, String(day), used, saved, moisture, health],
        );
      }
      n++;
    }

    for (let day = 14; day >= 0; day--) {
      await query(
        `INSERT INTO aggregated_stats
           (region_id, line_id, period_type, period_start, water_used_liters, water_saved_liters, avg_soil_moisture, plant_health_score, line_count)
         SELECT $1, NULL, 'daily', date_trunc('day', NOW()) - ($2 || ' days')::interval,
                COALESCE(SUM(water_used_liters),0), COALESCE(SUM(water_saved_liters),0),
                AVG(avg_soil_moisture), AVG(plant_health_score), COUNT(*)::int
         FROM aggregated_stats
         WHERE region_id = $1 AND line_id IS NOT NULL AND period_type = 'daily'
           AND period_start = date_trunc('day', NOW()) - ($2 || ' days')::interval
         ON CONFLICT DO NOTHING`,
        [district!.id, String(day)],
      );
    }
  }
}
