CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE region_level AS ENUM ('viloyat', 'tuman', 'shahar', 'mahalla');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE line_status AS ENUM ('active', 'maintenance', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sensor_type AS ENUM ('soil_moisture', 'water_flow', 'temperature');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE period_type AS ENUM ('hourly', 'daily', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'obodonlashtirish_admin',
    'obodonlashtirish_operator',
    'hokimiyat_viewer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE irrigation_mode AS ENUM ('manual', 'auto');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  level region_level NOT NULL,
  boundary GEOMETRY(Polygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);
CREATE INDEX IF NOT EXISTS idx_regions_level ON regions(level);
CREATE INDEX IF NOT EXISTS idx_regions_boundary ON regions USING GIST(boundary);

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
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

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
);

CREATE INDEX IF NOT EXISTS idx_lines_region ON irrigation_lines(region_id);
CREATE INDEX IF NOT EXISTS idx_lines_status ON irrigation_lines(status);
CREATE INDEX IF NOT EXISTS idx_lines_geometry ON irrigation_lines USING GIST(geometry);

CREATE TABLE IF NOT EXISTS sensors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_id UUID NOT NULL REFERENCES irrigation_lines(id) ON DELETE CASCADE,
  type sensor_type NOT NULL,
  serial_number VARCHAR(128) NOT NULL,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(line_id, type)
);

CREATE INDEX IF NOT EXISTS idx_sensors_line ON sensors(line_id);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL,
  unit VARCHAR(32) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_sensor_time ON sensor_readings(sensor_id, recorded_at DESC);

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
);

CREATE INDEX IF NOT EXISTS idx_agg_region_period ON aggregated_stats(region_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_agg_line_period ON aggregated_stats(line_id, period_type, period_start);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_id UUID NOT NULL REFERENCES irrigation_lines(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status ticket_status NOT NULL DEFAULT 'open',
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_line ON maintenance_tickets(line_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON maintenance_tickets(status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
