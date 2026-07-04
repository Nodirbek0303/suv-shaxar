import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import {
  login,
  logout,
  refreshTokenFlow,
  requireRoles,
  requireUser,
} from './auth';
import { ensureDatabaseReady } from './bootstrap';
import { many, one, query } from './db';

function plantHealthFromScore(score: number) {
  if (score >= 70) return 'good';
  if (score >= 40) return 'average';
  return 'poor';
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export async function createVercelApp(): Promise<Express> {
  await ensureDatabaseReady();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || /\.vercel\.app$/.test(origin) || /localhost/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type',
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    );
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });

  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      await query('SELECT 1');
      res.json({
        status: 'ok',
        database: 'ok',
        serverless: true,
        time: new Date().toISOString(),
      });
    }),
  );

  app.post(
    '/api/auth/login',
    asyncHandler(async (req, res) => {
      const { phone, password, panel } = req.body || {};
      const data = await login(phone, password, panel);
      res.json(data);
    }),
  );

  app.post(
    '/api/auth/refresh',
    asyncHandler(async (req, res) => {
      const data = await refreshTokenFlow(req.body?.refreshToken);
      res.json(data);
    }),
  );

  app.post(
    '/api/auth/logout',
    asyncHandler(async (req, res) => {
      res.json(await logout(req.body?.refreshToken || ''));
    }),
  );

  app.get(
    '/api/auth/me',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      const row = await one(
        `SELECT id, full_name, phone, role, region_id, created_at
         FROM users WHERE id = $1`,
        [user.sub],
      );
      res.json(row);
    }),
  );

  app.get(
    '/api/regions',
    asyncHandler(async (req, res) => {
      requireUser(req);
      const rows = await many(
        `SELECT id, name, parent_id, level,
                ST_AsGeoJSON(boundary)::json AS boundary, created_at
         FROM regions ORDER BY level, name`,
      );
      res.json(rows);
    }),
  );

  app.get(
    '/api/regions/:id/lines',
    asyncHandler(async (req, res) => {
      requireUser(req);
      const rows = await many(
        `SELECT l.id, l.code, l.region_id, l.plant_type, l.irrigation_type,
                l.length_meters, l.status, l.irrigation_mode, l.irrigation_on,
                ST_AsGeoJSON(l.geometry)::json AS geometry,
                ST_X(ST_Centroid(l.geometry)) AS center_lng,
                ST_Y(ST_Centroid(l.geometry)) AS center_lat
         FROM irrigation_lines l
         WHERE l.region_id = $1
            OR l.region_id IN (SELECT id FROM regions WHERE parent_id = $1)
         ORDER BY l.code`,
        [req.params.id],
      );
      res.json(rows);
    }),
  );

  app.get(
    '/api/lines',
    asyncHandler(async (req, res) => {
      requireUser(req);
      const regionId = req.query.regionId as string | undefined;
      const params: unknown[] = [];
      let where = '';
      if (regionId) {
        params.push(regionId);
        where = `WHERE l.region_id = $1 OR l.region_id IN (SELECT id FROM regions WHERE parent_id = $1)`;
      }
      const rows = await many(
        `SELECT l.*, r.name AS region_name,
                ST_AsGeoJSON(l.geometry)::json AS geometry,
                ST_X(ST_Centroid(l.geometry)) AS center_lng,
                ST_Y(ST_Centroid(l.geometry)) AS center_lat
         FROM irrigation_lines l
         JOIN regions r ON r.id = l.region_id
         ${where}
         ORDER BY l.code`,
        params,
      );
      res.json(
        rows.map((row: any) => ({
          id: row.id,
          code: row.code,
          regionId: row.region_id,
          regionName: row.region_name,
          plantType: row.plant_type,
          irrigationType: row.irrigation_type,
          lengthMeters: row.length_meters,
          status: row.status,
          irrigationMode: row.irrigation_mode,
          irrigationOn: row.irrigation_on,
          geometry: row.geometry,
          centerLng: row.center_lng,
          centerLat: row.center_lat,
        })),
      );
    }),
  );

  app.get(
    '/api/lines/:id',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, [
        'obodonlashtirish_admin',
        'obodonlashtirish_operator',
      ]);
      const row = await one<any>(
        `SELECT l.*, r.name AS region_name,
                ST_AsGeoJSON(l.geometry)::json AS geometry
         FROM irrigation_lines l
         JOIN regions r ON r.id = l.region_id
         WHERE l.id = $1`,
        [req.params.id],
      );
      if (!row) {
        res.status(404).json({ message: 'Liniya topilmadi' });
        return;
      }
      const sensors = await many(
        `SELECT s.id, s.type, s.serial_number, s.last_seen_at,
           (SELECT json_build_object('value', sr.value, 'unit', sr.unit, 'recorded_at', sr.recorded_at)
            FROM sensor_readings sr WHERE sr.sensor_id = s.id
            ORDER BY sr.recorded_at DESC LIMIT 1) AS last_reading
         FROM sensors s WHERE s.line_id = $1 ORDER BY s.type`,
        [req.params.id],
      );
      res.json({
        id: row.id,
        code: row.code,
        regionId: row.region_id,
        regionName: row.region_name,
        plantType: row.plant_type,
        lengthMeters: row.length_meters,
        status: row.status,
        irrigationMode: row.irrigation_mode,
        irrigationOn: row.irrigation_on,
        geometry: row.geometry,
        sensors,
      });
    }),
  );

  app.get(
    '/api/lines/:id/history',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, [
        'obodonlashtirish_admin',
        'obodonlashtirish_operator',
      ]);
      const hours = Number(req.query.hours || 24);
      const sensorType = req.query.sensorType as string | undefined;
      const params: unknown[] = [req.params.id, hours];
      let typeFilter = '';
      if (sensorType) {
        params.push(sensorType);
        typeFilter = 'AND s.type = $3';
      }
      const rows = await many(
        `SELECT s.type AS sensor_type, sr.value, sr.unit, sr.recorded_at
         FROM sensor_readings sr
         JOIN sensors s ON s.id = sr.sensor_id
         WHERE s.line_id = $1
           AND sr.recorded_at >= NOW() - ($2 || ' hours')::interval
           ${typeFilter}
         ORDER BY sr.recorded_at ASC`,
        params,
      );
      res.json(rows);
    }),
  );

  app.post(
    '/api/lines/:id/irrigation',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, [
        'obodonlashtirish_admin',
        'obodonlashtirish_operator',
      ]);
      await query(
        `UPDATE irrigation_lines
         SET irrigation_on = $2,
             irrigation_mode = COALESCE($3, irrigation_mode),
             updated_at = NOW()
         WHERE id = $1`,
        [req.params.id, !!req.body?.irrigationOn, req.body?.irrigationMode || null],
      );
      const row = await one<any>(
        `SELECT l.*, r.name AS region_name FROM irrigation_lines l
         JOIN regions r ON r.id = l.region_id WHERE l.id = $1`,
        [req.params.id],
      );
      res.json({
        id: row.id,
        code: row.code,
        regionName: row.region_name,
        irrigationOn: row.irrigation_on,
        irrigationMode: row.irrigation_mode,
        status: row.status,
        plantType: row.plant_type,
        lengthMeters: row.length_meters,
        sensors: await many(
          `SELECT s.id, s.type, s.serial_number, s.last_seen_at,
             (SELECT json_build_object('value', sr.value, 'unit', sr.unit, 'recorded_at', sr.recorded_at)
              FROM sensor_readings sr WHERE sr.sensor_id = s.id
              ORDER BY sr.recorded_at DESC LIMIT 1) AS last_reading
           FROM sensors s WHERE s.line_id = $1`,
          [req.params.id],
        ),
      });
    }),
  );

  // --- OPS ---
  app.get(
    '/api/ops/overview',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, [
        'obodonlashtirish_admin',
        'obodonlashtirish_operator',
      ]);
      const lines = await one<any>(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                COUNT(*) FILTER (WHERE irrigation_on = TRUE)::int AS irrigating
         FROM irrigation_lines`,
      );
      const flow = await one<any>(
        `SELECT COALESCE(AVG(sr.value), 0) AS avg_flow
         FROM sensor_readings sr JOIN sensors s ON s.id = sr.sensor_id
         WHERE s.type = 'water_flow' AND sr.recorded_at >= NOW() - INTERVAL '10 minutes'`,
      );
      const moisture = await one<any>(
        `SELECT COALESCE(AVG(sr.value), 0) AS avg_m
         FROM sensor_readings sr JOIN sensors s ON s.id = sr.sensor_id
         WHERE s.type = 'soil_moisture' AND sr.recorded_at >= NOW() - INTERVAL '10 minutes'`,
      );
      const todaySaved = await one<any>(
        `SELECT COALESCE(SUM(water_saved_liters), 0) AS saved
         FROM aggregated_stats
         WHERE period_type = 'daily' AND line_id IS NULL
           AND period_start = (SELECT MAX(period_start) FROM aggregated_stats WHERE period_type = 'daily' AND line_id IS NULL)`,
      );
      const faulty = await one<any>(
        `SELECT COUNT(*)::int AS count FROM sensors
         WHERE last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '2 minutes'`,
      );
      const openTickets = await one<any>(
        `SELECT COUNT(*)::int AS count FROM maintenance_tickets WHERE status != 'resolved'`,
      );
      const faultyCount = Number(faulty?.count || 0);
      res.json({
        totalLines: lines?.total || 0,
        activeLines: lines?.active || 0,
        irrigatingLines: lines?.irrigating || 0,
        currentFlowM3h: Math.round((Number(flow?.avg_flow || 0) / 1000) * 100) / 100,
        avgSoilMoisture: Math.round(Number(moisture?.avg_m || 0) * 10) / 10,
        todaySavedM3: Number(todaySaved?.saved || 0) / 1000,
        faultySensors: faultyCount,
        openTickets: openTickets?.count || 0,
        systemStatus: faultyCount > 5 ? 'danger' : faultyCount > 0 ? 'warning' : 'ok',
      });
    }),
  );

  app.get(
    '/api/ops/alerts',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, [
        'obodonlashtirish_admin',
        'obodonlashtirish_operator',
      ]);
      const offline = await many<any>(
        `SELECT s.id, s.type, s.last_seen_at, l.id AS line_id, l.code AS line_code
         FROM sensors s JOIN irrigation_lines l ON l.id = s.line_id
         WHERE s.last_seen_at IS NULL OR s.last_seen_at < NOW() - INTERVAL '2 minutes'
         LIMIT 50`,
      );
      const tickets = await many<any>(
        `SELECT t.id, t.status, t.description, t.created_at, l.code AS line_code, l.id AS line_id
         FROM maintenance_tickets t JOIN irrigation_lines l ON l.id = t.line_id
         WHERE t.status != 'resolved' ORDER BY t.created_at DESC LIMIT 30`,
      );
      const alerts = [
        ...offline.map((s) => ({
          id: `sensor-${s.id}`,
          severity: 'danger',
          type: 'sensor_offline',
          message: `Sensor offline: ${s.line_code} / ${s.type}`,
          lineId: s.line_id,
          lineCode: s.line_code,
          createdAt: s.last_seen_at || new Date().toISOString(),
        })),
        ...tickets.map((t) => ({
          id: `ticket-${t.id}`,
          severity: t.status === 'open' ? 'warning' : 'info',
          type: 'ticket',
          message: t.description,
          lineId: t.line_id,
          lineCode: t.line_code,
          createdAt: t.created_at,
        })),
      ];
      res.json(alerts);
    }),
  );

  app.get(
    '/api/ops/sensors',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, [
        'obodonlashtirish_admin',
        'obodonlashtirish_operator',
      ]);
      const lineId = req.query.lineId as string | undefined;
      const params: unknown[] = [];
      let where = '';
      if (lineId) {
        params.push(lineId);
        where = 'WHERE s.line_id = $1';
      }
      const rows = await many<any>(
        `SELECT s.id, s.line_id, s.type, s.serial_number, s.last_seen_at, l.code AS line_code,
           (SELECT json_build_object('value', sr.value, 'unit', sr.unit, 'recorded_at', sr.recorded_at)
            FROM sensor_readings sr WHERE sr.sensor_id = s.id
            ORDER BY sr.recorded_at DESC LIMIT 1) AS last_reading
         FROM sensors s JOIN irrigation_lines l ON l.id = s.line_id
         ${where}
         ORDER BY s.last_seen_at DESC NULLS LAST`,
        params,
      );
      res.json(
        rows.map((s) => {
          const online =
            s.last_seen_at &&
            new Date(s.last_seen_at).getTime() > Date.now() - 2 * 60 * 1000;
          return {
            id: s.id,
            lineId: s.line_id,
            lineCode: s.line_code,
            type: s.type,
            serialNumber: s.serial_number,
            lastSeenAt: s.last_seen_at,
            online: !!online,
            batteryPercent: online ? 85 : 12,
            lastReading: s.last_reading,
          };
        }),
      );
    }),
  );

  app.get(
    '/api/ops/programs',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, [
        'obodonlashtirish_admin',
        'obodonlashtirish_operator',
      ]);
      const lines = await many<any>(
        `SELECT id, code, irrigation_mode, irrigation_on, status, plant_type
         FROM irrigation_lines WHERE irrigation_mode = 'auto' ORDER BY code`,
      );
      res.json(
        lines.map((l: any, i: number) => ({
          id: l.id,
          name: `Auto-${l.code}`,
          lineId: l.id,
          lineCode: l.code,
          plantType: l.plant_type,
          status: l.irrigation_on ? 'running' : 'idle',
          mode: l.irrigation_mode,
          schedule: '18:00–22:00',
          moistureThreshold: 35,
          active: l.status === 'active',
          order: i + 1,
        })),
      );
    }),
  );

  app.get(
    '/api/ops/map-lines',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, [
        'obodonlashtirish_admin',
        'obodonlashtirish_operator',
      ]);
      const lines = await many<any>(
        `SELECT l.id, l.code, l.region_id, l.status, l.irrigation_on, l.irrigation_mode,
                l.plant_type, l.length_meters, r.name AS region_name,
                ST_AsGeoJSON(l.geometry)::json AS geometry,
                ST_X(ST_Centroid(l.geometry)) AS center_lng,
                ST_Y(ST_Centroid(l.geometry)) AS center_lat
         FROM irrigation_lines l JOIN regions r ON r.id = l.region_id
         ORDER BY l.code`,
      );
      const result = [];
      for (const l of lines) {
        const sensors = await many<any>(
          `SELECT s.type, s.last_seen_at,
             (SELECT sr.value FROM sensor_readings sr WHERE sr.sensor_id = s.id
              ORDER BY sr.recorded_at DESC LIMIT 1) AS value
           FROM sensors s WHERE s.line_id = $1`,
          [l.id],
        );
        const offline = sensors.filter(
          (s) =>
            !s.last_seen_at ||
            new Date(s.last_seen_at).getTime() < Date.now() - 2 * 60 * 1000,
        ).length;
        const moisture = sensors.find((s) => s.type === 'soil_moisture')?.value;
        let health: string = 'normal';
        if (l.status === 'maintenance' || offline > 0) health = 'danger';
        else if (moisture != null && Number(moisture) < 30) health = 'warning';
        else if (l.irrigation_on) health = 'irrigating';
        result.push({
          id: l.id,
          code: l.code,
          regionId: l.region_id,
          regionName: l.region_name,
          status: l.status,
          irrigationOn: l.irrigation_on,
          irrigationMode: l.irrigation_mode,
          plantType: l.plant_type,
          lengthMeters: l.length_meters,
          geometry: l.geometry,
          centerLng: l.center_lng,
          centerLat: l.center_lat,
          health,
          moisture: moisture != null ? Number(moisture) : null,
          offlineSensors: offline,
          sensorCount: sensors.length,
        });
      }
      res.json(result);
    }),
  );

  app.post(
    '/api/ops/bulk-irrigation',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, [
        'obodonlashtirish_admin',
        'obodonlashtirish_operator',
      ]);
      const lineIds: string[] = req.body?.lineIds || [];
      const irrigationOn = !!req.body?.irrigationOn;
      if (!lineIds.length) {
        res.json({ updated: 0 });
        return;
      }
      await query(
        `UPDATE irrigation_lines
         SET irrigation_on = $2, irrigation_mode = 'manual', updated_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [lineIds, irrigationOn],
      );
      res.json({ updated: lineIds.length, irrigationOn });
    }),
  );

  // --- MONITORING ---
  app.get(
    '/api/monitoring/overview',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, ['hokimiyat_viewer']);
      const regionId = req.query.regionId as string | undefined;
      const params: unknown[] = [];
      let regionFilter = '';
      if (regionId) {
        params.push(regionId);
        regionFilter = 'AND (r.id = $1 OR r.parent_id = $1)';
      }
      const lineCount = await one<any>(
        `SELECT COUNT(*)::int AS count FROM irrigation_lines l
         JOIN regions r ON r.id = l.region_id WHERE 1=1 ${regionFilter}`,
        params,
      );
      const stats = await one<any>(
        `SELECT COALESCE(SUM(a.water_used_liters), 0) AS water_used,
                COALESCE(SUM(a.water_saved_liters), 0) AS water_saved,
                COALESCE(AVG(a.plant_health_score), 0) AS avg_health,
                COALESCE(AVG(a.avg_soil_moisture), 0) AS avg_moisture
         FROM aggregated_stats a JOIN regions r ON r.id = a.region_id
         WHERE a.period_type = 'daily' AND a.line_id IS NULL
           AND a.period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'
           ${regionFilter}`,
        params,
      );
      const used = Number(stats?.water_used || 0);
      const saved = Number(stats?.water_saved || 0);
      const health = Number(stats?.avg_health || 0);
      const savedPercent = used + saved > 0 ? (saved / (used + saved)) * 100 : 0;
      res.json({
        totalLines: lineCount?.count || 0,
        waterUsedM3: used / 1000,
        waterSavedM3: saved / 1000,
        waterSavedPercent: Math.round(savedPercent * 10) / 10,
        plantHealthScore: Math.round(health * 10) / 10,
        plantHealthLevel: plantHealthFromScore(health),
        avgSoilMoisture: Math.round(Number(stats?.avg_moisture || 0) * 10) / 10,
      });
    }),
  );

  app.get(
    '/api/monitoring/overview/today',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, ['hokimiyat_viewer']);
      const stats = await one<any>(
        `SELECT COALESCE(SUM(water_used_liters), 0) AS water_used,
                COALESCE(SUM(water_saved_liters), 0) AS water_saved,
                COALESCE(AVG(plant_health_score), 0) AS avg_health
         FROM aggregated_stats
         WHERE period_type = 'daily' AND line_id IS NULL
           AND period_start = (SELECT MAX(period_start) FROM aggregated_stats WHERE period_type = 'daily' AND line_id IS NULL)`,
      );
      const used = Number(stats?.water_used || 0);
      const saved = Number(stats?.water_saved || 0);
      const health = Number(stats?.avg_health || 0);
      const savedPercent = used + saved > 0 ? (saved / (used + saved)) * 100 : 0;
      res.json({
        waterUsedM3: used / 1000,
        waterSavedM3: saved / 1000,
        waterSavedPercent: Math.round(savedPercent * 10) / 10,
        plantHealthScore: Math.round(health * 10) / 10,
        plantHealthLevel: plantHealthFromScore(health),
      });
    }),
  );

  app.get(
    '/api/monitoring/regions',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, ['hokimiyat_viewer']);
      const rows = await many<any>(
        `SELECT r.id, r.name, r.level,
                COUNT(DISTINCT l.id)::int AS line_count,
                COALESCE(SUM(a.water_used_liters), 0) AS water_used,
                COALESCE(SUM(a.water_saved_liters), 0) AS water_saved,
                COALESCE(AVG(a.plant_health_score), 0) AS plant_health_score,
                ST_AsGeoJSON(r.boundary)::json AS boundary
         FROM regions r
         LEFT JOIN irrigation_lines l ON l.region_id = r.id
         LEFT JOIN aggregated_stats a ON a.region_id = r.id AND a.line_id IS NULL
           AND a.period_type = 'daily'
           AND a.period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'
         WHERE r.level IN ('tuman', 'shahar')
         GROUP BY r.id, r.name, r.level, r.boundary
         ORDER BY r.name`,
      );
      res.json(
        rows.map((r) => {
          const used = Number(r.water_used);
          const saved = Number(r.water_saved);
          const savedPercent = used + saved > 0 ? (saved / (used + saved)) * 100 : 0;
          return {
            id: r.id,
            name: r.name,
            level: r.level,
            lineCount: r.line_count,
            waterUsedM3: used / 1000,
            waterSavedM3: saved / 1000,
            waterSavedPercent: Math.round(savedPercent * 10) / 10,
            plantHealthScore: Math.round(Number(r.plant_health_score) * 10) / 10,
            plantHealthLevel: plantHealthFromScore(Number(r.plant_health_score)),
            boundary: r.boundary,
          };
        }),
      );
    }),
  );

  app.get(
    '/api/monitoring/trends',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, ['hokimiyat_viewer']);
      const days = Number(req.query.days || 30);
      const regionId = req.query.regionId as string | undefined;
      const params: unknown[] = [days];
      let regionFilter = 'AND a.line_id IS NULL';
      if (regionId) {
        params.push(regionId);
        regionFilter += ' AND a.region_id = $2';
      }
      const rows = await many<any>(
        `SELECT a.period_start,
                SUM(a.water_used_liters) AS water_used,
                SUM(a.water_saved_liters) AS water_saved,
                AVG(a.plant_health_score) AS plant_health_score,
                AVG(a.avg_soil_moisture) AS avg_soil_moisture
         FROM aggregated_stats a
         WHERE a.period_type = 'daily'
           AND a.period_start >= date_trunc('day', NOW()) - ($1 || ' days')::interval
           ${regionFilter}
         GROUP BY a.period_start
         ORDER BY a.period_start ASC`,
        params,
      );
      res.json(
        rows.map((r) => ({
          periodStart: r.period_start,
          waterUsedM3: Number(r.water_used) / 1000,
          waterSavedM3: Number(r.water_saved) / 1000,
          plantHealthScore: Math.round(Number(r.plant_health_score) * 10) / 10,
          avgSoilMoisture: Math.round(Number(r.avg_soil_moisture) * 10) / 10,
        })),
      );
    }),
  );

  app.get(
    '/api/monitoring/plant-health',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, ['hokimiyat_viewer']);
      // reuse regions endpoint logic inline
      const rows = await many<any>(
        `SELECT r.id, r.name, r.level,
                COUNT(DISTINCT l.id)::int AS line_count,
                COALESCE(SUM(a.water_used_liters), 0) AS water_used,
                COALESCE(SUM(a.water_saved_liters), 0) AS water_saved,
                COALESCE(AVG(a.plant_health_score), 0) AS plant_health_score,
                ST_AsGeoJSON(r.boundary)::json AS boundary
         FROM regions r
         LEFT JOIN irrigation_lines l ON l.region_id = r.id
         LEFT JOIN aggregated_stats a ON a.region_id = r.id AND a.line_id IS NULL
           AND a.period_type = 'daily'
           AND a.period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'
         WHERE r.level IN ('tuman', 'shahar')
         GROUP BY r.id, r.name, r.level, r.boundary`,
      );
      const regions = rows.map((r) => {
        const used = Number(r.water_used);
        const saved = Number(r.water_saved);
        const savedPercent = used + saved > 0 ? (saved / (used + saved)) * 100 : 0;
        const score = Number(r.plant_health_score);
        return {
          id: r.id,
          name: r.name,
          level: r.level,
          lineCount: r.line_count,
          waterUsedM3: used / 1000,
          waterSavedM3: saved / 1000,
          waterSavedPercent: Math.round(savedPercent * 10) / 10,
          plantHealthScore: Math.round(score * 10) / 10,
          plantHealthLevel: plantHealthFromScore(score),
          boundary: r.boundary,
        };
      });
      const buckets = { good: 0, average: 0, poor: 0 };
      for (const r of regions) {
        buckets[r.plantHealthLevel as keyof typeof buckets]++;
      }
      const total = regions.length || 1;
      const avg =
        regions.reduce((s, r) => s + r.plantHealthScore, 0) / (regions.length || 1);
      const sorted = [...regions].sort(
        (a, b) => b.plantHealthScore - a.plantHealthScore,
      );
      res.json({
        score: Math.round(avg * 10) / 10,
        level: plantHealthFromScore(avg),
        distribution: {
          good: Math.round((buckets.good / total) * 1000) / 10,
          average: Math.round((buckets.average / total) * 1000) / 10,
          poor: Math.round((buckets.poor / total) * 1000) / 10,
          goodCount: buckets.good,
          averageCount: buckets.average,
          poorCount: buckets.poor,
        },
        best: sorted.slice(0, 5),
        worst: [...sorted].reverse().slice(0, 5),
        regions,
      });
    }),
  );

  app.get(
    '/api/monitoring/water-savings',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, ['hokimiyat_viewer']);
      const days = 30;
      const trends = await many<any>(
        `SELECT a.period_start,
                SUM(a.water_used_liters) AS water_used,
                SUM(a.water_saved_liters) AS water_saved
         FROM aggregated_stats a
         WHERE a.period_type = 'daily' AND a.line_id IS NULL
           AND a.period_start >= date_trunc('day', NOW()) - ($1 || ' days')::interval
         GROUP BY a.period_start ORDER BY a.period_start ASC`,
        [days],
      );
      const overview = await one<any>(
        `SELECT COALESCE(SUM(water_used_liters), 0) AS water_used,
                COALESCE(SUM(water_saved_liters), 0) AS water_saved
         FROM aggregated_stats
         WHERE period_type = 'daily' AND line_id IS NULL
           AND period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'`,
      );
      const used = Number(overview?.water_used || 0);
      const saved = Number(overview?.water_saved || 0);
      const savedPercent = used + saved > 0 ? (saved / (used + saved)) * 100 : 0;
      res.json({
        period: req.query.period || 'daily',
        totalSavedM3: saved / 1000,
        totalUsedM3: used / 1000,
        savedPercent: Math.round(savedPercent * 10) / 10,
        trends: trends.map((t) => ({
          periodStart: t.period_start,
          waterUsedM3: Number(t.water_used) / 1000,
          waterSavedM3: Number(t.water_saved) / 1000,
        })),
        ranking: [],
      });
    }),
  );

  app.get(
    '/api/monitoring/lines',
    asyncHandler(async (req, res) => {
      const user = requireUser(req);
      requireRoles(user, ['hokimiyat_viewer']);
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const offset = (page - 1) * limit;
      const count = await one<any>(`SELECT COUNT(*)::int AS c FROM irrigation_lines`);
      const rows = await many<any>(
        `SELECT l.id, l.code, l.length_meters, l.plant_type, l.status, l.updated_at,
                r.id AS region_id, r.name AS region_name,
                COALESCE(AVG(a.water_used_liters), 0) AS avg_water_used,
                COALESCE(AVG(a.water_saved_liters), 0) AS avg_water_saved,
                COALESCE(AVG(a.plant_health_score), 0) AS health_score
         FROM irrigation_lines l
         JOIN regions r ON r.id = l.region_id
         LEFT JOIN aggregated_stats a ON a.line_id = l.id AND a.period_type = 'daily'
           AND a.period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'
         GROUP BY l.id, r.id, r.name
         ORDER BY l.code
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      res.json({
        total: count?.c || 0,
        page,
        limit,
        items: rows.map((r) => {
          const used = Number(r.avg_water_used);
          const saved = Number(r.avg_water_saved);
          const savedPct = used + saved > 0 ? (saved / (used + saved)) * 100 : 0;
          const score = Number(r.health_score);
          return {
            id: r.id,
            code: r.code,
            regionId: r.region_id,
            regionName: r.region_name,
            lengthMeters: Number(r.length_meters),
            plantType: r.plant_type,
            status: r.status,
            avgWaterUsedM3: used / 1000,
            waterSavedPercent: Math.round(savedPct * 10) / 10,
            plantHealthScore: Math.round(score * 10) / 10,
            plantHealthLevel: plantHealthFromScore(score),
            updatedAt: r.updated_at,
          };
        }),
      });
    }),
  );

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      statusCode: status,
      message: err.message || 'Internal error',
    });
  });

  return app;
}
