import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class OpsService {
  constructor(private readonly db: DatabaseService) {}

  async getOverview() {
    const lines = await this.db.one<{
      total: string;
      active: string;
      irrigating: string;
      maintenance: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'active')::text AS active,
         COUNT(*) FILTER (WHERE irrigation_on = TRUE)::text AS irrigating,
         COUNT(*) FILTER (WHERE status = 'maintenance')::text AS maintenance
       FROM irrigation_lines`,
    );

    const flow = await this.db.one<{ avg_flow: number }>(
      `SELECT COALESCE(AVG(sr.value), 0) AS avg_flow
       FROM sensor_readings sr
       JOIN sensors s ON s.id = sr.sensor_id
       WHERE s.type = 'water_flow'
         AND sr.recorded_at >= NOW() - INTERVAL '10 minutes'`,
    );

    const moisture = await this.db.one<{ avg_m: number }>(
      `SELECT COALESCE(AVG(sr.value), 0) AS avg_m
       FROM sensor_readings sr
       JOIN sensors s ON s.id = sr.sensor_id
       WHERE s.type = 'soil_moisture'
         AND sr.recorded_at >= NOW() - INTERVAL '10 minutes'`,
    );

    const todaySaved = await this.db.one<{ saved: number }>(
      `SELECT COALESCE(SUM(water_saved_liters), 0) AS saved
       FROM aggregated_stats
       WHERE period_type = 'daily'
         AND line_id IS NULL
         AND period_start = (
           SELECT MAX(period_start) FROM aggregated_stats
           WHERE period_type = 'daily' AND line_id IS NULL
         )`,
    );

    const faulty = await this.db.one<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM sensors
       WHERE last_seen_at IS NULL
          OR last_seen_at < NOW() - INTERVAL '2 minutes'`,
    );

    const openTickets = await this.db.one<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM maintenance_tickets
       WHERE status != 'resolved'`,
    );

    return {
      totalLines: Number(lines?.total ?? 0),
      activeLines: Number(lines?.active ?? 0),
      irrigatingLines: Number(lines?.irrigating ?? 0),
      maintenanceLines: Number(lines?.maintenance ?? 0),
      currentFlowM3h: Math.round((Number(flow?.avg_flow ?? 0) / 1000) * 100) / 100,
      avgSoilMoisture: Math.round(Number(moisture?.avg_m ?? 0) * 10) / 10,
      todaySavedM3: Number(todaySaved?.saved ?? 0) / 1000,
      faultySensors: Number(faulty?.count ?? 0),
      openTickets: Number(openTickets?.count ?? 0),
      systemStatus:
        Number(faulty?.count ?? 0) > 5
          ? 'danger'
          : Number(faulty?.count ?? 0) > 0
            ? 'warning'
            : 'ok',
    };
  }

  async getSensors(lineId?: string) {
    const params: unknown[] = [];
    let where = '';
    if (lineId) {
      params.push(lineId);
      where = 'WHERE s.line_id = $1';
    }

    const rows = await this.db.many(
      `SELECT
         s.id, s.line_id, s.type, s.serial_number, s.last_seen_at,
         l.code AS line_code,
         (
           SELECT json_build_object('value', sr.value, 'unit', sr.unit, 'recorded_at', sr.recorded_at)
           FROM sensor_readings sr
           WHERE sr.sensor_id = s.id
           ORDER BY sr.recorded_at DESC
           LIMIT 1
         ) AS last_reading
       FROM sensors s
       JOIN irrigation_lines l ON l.id = s.line_id
       ${where}
       ORDER BY s.last_seen_at DESC NULLS LAST`,
      params,
    );

    return rows.map((s) => {
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
        batteryPercent: online ? 70 + Math.floor(Math.random() * 30) : 15,
        lastReading: s.last_reading,
      };
    });
  }

  async getAlerts() {
    const offlineSensors = await this.db.many(
      `SELECT s.id, s.type, s.last_seen_at, l.id AS line_id, l.code AS line_code
       FROM sensors s
       JOIN irrigation_lines l ON l.id = s.line_id
       WHERE s.last_seen_at IS NULL
          OR s.last_seen_at < NOW() - INTERVAL '2 minutes'
       ORDER BY s.last_seen_at ASC NULLS FIRST
       LIMIT 50`,
    );

    const tickets = await this.db.many(
      `SELECT t.id, t.status, t.description, t.created_at, l.code AS line_code, l.id AS line_id
       FROM maintenance_tickets t
       JOIN irrigation_lines l ON l.id = t.line_id
       WHERE t.status != 'resolved'
       ORDER BY t.created_at DESC
       LIMIT 30`,
    );

    const lowMoisture = await this.db.many(
      `SELECT DISTINCT ON (l.id)
         l.id AS line_id, l.code AS line_code, sr.value AS moisture
       FROM irrigation_lines l
       JOIN sensors s ON s.line_id = l.id AND s.type = 'soil_moisture'
       JOIN sensor_readings sr ON sr.sensor_id = s.id
       WHERE sr.recorded_at >= NOW() - INTERVAL '30 minutes'
         AND sr.value < 30
       ORDER BY l.id, sr.recorded_at DESC
       LIMIT 20`,
    );

    const alerts: any[] = [];

    for (const s of offlineSensors) {
      alerts.push({
        id: `sensor-${s.id}`,
        severity: 'danger',
        type: 'sensor_offline',
        message: `Sensor offline: ${s.line_code} / ${s.type}`,
        lineId: s.line_id,
        lineCode: s.line_code,
        createdAt: s.last_seen_at || new Date().toISOString(),
      });
    }

    for (const t of tickets) {
      alerts.push({
        id: `ticket-${t.id}`,
        severity: t.status === 'open' ? 'warning' : 'info',
        type: 'ticket',
        message: t.description,
        lineId: t.line_id,
        lineCode: t.line_code,
        createdAt: t.created_at,
      });
    }

    for (const m of lowMoisture) {
      alerts.push({
        id: `moisture-${m.line_id}`,
        severity: 'warning',
        type: 'low_moisture',
        message: `Past namlik: ${m.line_code} (${Number(m.moisture).toFixed(1)}%)`,
        lineId: m.line_id,
        lineCode: m.line_code,
        createdAt: new Date().toISOString(),
      });
    }

    return alerts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getPrograms() {
    // MVP: virtual programs derived from lines in auto mode
    const lines = await this.db.many(
      `SELECT id, code, irrigation_mode, irrigation_on, status, plant_type, region_id
       FROM irrigation_lines
       WHERE irrigation_mode = 'auto'
       ORDER BY code`,
    );

    return lines.map((l, i) => ({
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
    }));
  }

  async bulkIrrigation(lineIds: string[], irrigationOn: boolean, userId: string) {
    if (!lineIds.length) return { updated: 0 };

    await this.db.query(
      `UPDATE irrigation_lines
       SET irrigation_on = $2, irrigation_mode = 'manual', updated_at = NOW()
       WHERE id = ANY($1::uuid[])`,
      [lineIds, irrigationOn],
    );

    await this.db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, details)
       VALUES ($1, 'bulk_irrigation', 'irrigation_line', $2)`,
      [userId, JSON.stringify({ lineIds, irrigationOn })],
    );

    return { updated: lineIds.length, irrigationOn };
  }

  async getLineHealthMap() {
    const lines = await this.db.many(
      `SELECT
         l.id, l.code, l.region_id, l.status, l.irrigation_on, l.irrigation_mode,
         l.plant_type, l.length_meters,
         ST_AsGeoJSON(l.geometry)::json AS geometry,
         ST_X(ST_Centroid(l.geometry)) AS center_lng,
         ST_Y(ST_Centroid(l.geometry)) AS center_lat,
         r.name AS region_name
       FROM irrigation_lines l
       JOIN regions r ON r.id = l.region_id
       ORDER BY l.code`,
    );

    const result: any[] = [];
    for (const l of lines) {
      const sensors = await this.db.many(
        `SELECT s.id, s.type, s.last_seen_at,
           (SELECT sr.value FROM sensor_readings sr
            WHERE sr.sensor_id = s.id ORDER BY sr.recorded_at DESC LIMIT 1) AS value
         FROM sensors s WHERE s.line_id = $1`,
        [l.id],
      );

      const offline = sensors.filter(
        (s) =>
          !s.last_seen_at ||
          new Date(s.last_seen_at).getTime() < Date.now() - 2 * 60 * 1000,
      ).length;

      const moisture = sensors.find((s) => s.type === 'soil_moisture')?.value;
      let health: 'normal' | 'warning' | 'danger' | 'irrigating' = 'normal';
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
    return result;
  }

  async createSensor(data: {
    lineId: string;
    type: string;
    serialNumber: string;
  }) {
    const line = await this.db.one(
      'SELECT id FROM irrigation_lines WHERE id = $1',
      [data.lineId],
    );
    if (!line) throw new NotFoundException('Liniya topilmadi');

    return this.db.one(
      `INSERT INTO sensors (line_id, type, serial_number)
       VALUES ($1, $2, $3)
       RETURNING id, line_id, type, serial_number, last_seen_at`,
      [data.lineId, data.type, data.serialNumber],
    );
  }
}
