import { Injectable, NotFoundException } from '@nestjs/common';
import { PeriodType, plantHealthFromScore } from '@suv/shared';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MonitoringService {
  constructor(private readonly db: DatabaseService) {}

  /** Aggregated KPIs only — never raw sensor readings. */
  async getOverview(regionId?: string) {
    const params: unknown[] = [];
    let regionFilter = '';
    if (regionId) {
      params.push(regionId);
      regionFilter = `AND (r.id = $1 OR r.parent_id = $1)`;
    }

    const lineCount = await this.db.one<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM irrigation_lines l
       JOIN regions r ON r.id = l.region_id
       WHERE 1=1 ${regionFilter}`,
      params,
    );

    const stats = await this.db.one<{
      water_used: number;
      water_saved: number;
      avg_health: number;
      avg_moisture: number;
    }>(
      `SELECT
         COALESCE(SUM(a.water_used_liters), 0) AS water_used,
         COALESCE(SUM(a.water_saved_liters), 0) AS water_saved,
         COALESCE(AVG(a.plant_health_score), 0) AS avg_health,
         COALESCE(AVG(a.avg_soil_moisture), 0) AS avg_moisture
       FROM aggregated_stats a
       JOIN regions r ON r.id = a.region_id
       WHERE a.period_type = 'daily'
         AND a.line_id IS NULL
         AND a.period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'
         ${regionFilter}`,
      params,
    );

    const used = Number(stats?.water_used ?? 0);
    const saved = Number(stats?.water_saved ?? 0);
    const health = Number(stats?.avg_health ?? 0);
    const savedPercent = used + saved > 0 ? (saved / (used + saved)) * 100 : 0;

    return {
      totalLines: Number(lineCount?.count ?? 0),
      waterUsedM3: used / 1000,
      waterSavedM3: saved / 1000,
      waterSavedPercent: Math.round(savedPercent * 10) / 10,
      plantHealthScore: Math.round(health * 10) / 10,
      plantHealthLevel: plantHealthFromScore(health),
      avgSoilMoisture: Math.round(Number(stats?.avg_moisture ?? 0) * 10) / 10,
    };
  }

  async getTodayOverview(regionId?: string) {
    const params: unknown[] = [];
    let regionFilter = '';
    if (regionId) {
      params.push(regionId);
      regionFilter = `AND (r.id = $1 OR r.parent_id = $1)`;
    }

    const stats = await this.db.one<{
      water_used: number;
      water_saved: number;
      avg_health: number;
    }>(
      `SELECT
         COALESCE(SUM(a.water_used_liters), 0) AS water_used,
         COALESCE(SUM(a.water_saved_liters), 0) AS water_saved,
         COALESCE(AVG(a.plant_health_score), 0) AS avg_health
       FROM aggregated_stats a
       JOIN regions r ON r.id = a.region_id
       WHERE a.period_type = 'daily'
         AND a.line_id IS NULL
         AND a.period_start = date_trunc('day', NOW())
         ${regionFilter}`,
      params,
    );

    // Fallback: latest available day if today not yet aggregated
    let used = Number(stats?.water_used ?? 0);
    let saved = Number(stats?.water_saved ?? 0);
    let health = Number(stats?.avg_health ?? 0);

    if (used === 0 && saved === 0) {
      const latest = await this.db.one<{
        water_used: number;
        water_saved: number;
        avg_health: number;
        period_start: Date;
      }>(
        `SELECT
           COALESCE(SUM(a.water_used_liters), 0) AS water_used,
           COALESCE(SUM(a.water_saved_liters), 0) AS water_saved,
           COALESCE(AVG(a.plant_health_score), 0) AS avg_health,
           MAX(a.period_start) AS period_start
         FROM aggregated_stats a
         JOIN regions r ON r.id = a.region_id
         WHERE a.period_type = 'daily'
           AND a.line_id IS NULL
           AND a.period_start = (
             SELECT MAX(period_start) FROM aggregated_stats
             WHERE period_type = 'daily' AND line_id IS NULL
           )
           ${regionFilter}`,
        params,
      );
      used = Number(latest?.water_used ?? 0);
      saved = Number(latest?.water_saved ?? 0);
      health = Number(latest?.avg_health ?? 0);
    }

    const savedPercent = used + saved > 0 ? (saved / (used + saved)) * 100 : 0;

    return {
      waterUsedM3: used / 1000,
      waterSavedM3: saved / 1000,
      waterSavedPercent: Math.round(savedPercent * 10) / 10,
      plantHealthScore: Math.round(health * 10) / 10,
      plantHealthLevel: plantHealthFromScore(health),
    };
  }

  async getRegionComparison() {
    const rows = await this.db.many(
      `SELECT
         r.id, r.name, r.level,
         COUNT(DISTINCT l.id)::int AS line_count,
         COALESCE(SUM(a.water_used_liters), 0) AS water_used,
         COALESCE(SUM(a.water_saved_liters), 0) AS water_saved,
         COALESCE(AVG(a.plant_health_score), 0) AS plant_health_score,
         ST_AsGeoJSON(r.boundary)::json AS boundary
       FROM regions r
       LEFT JOIN irrigation_lines l ON l.region_id = r.id
       LEFT JOIN aggregated_stats a
         ON a.region_id = r.id
         AND a.line_id IS NULL
         AND a.period_type = 'daily'
         AND a.period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'
       WHERE r.level IN ('tuman', 'shahar')
       GROUP BY r.id, r.name, r.level, r.boundary
       ORDER BY r.name`,
    );

    return rows.map((r) => {
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
    });
  }

  async getRegionDetail(id: string) {
    const regions = await this.getRegionComparison();
    const region = regions.find((r) => r.id === id);
    if (!region) throw new NotFoundException('Hudud topilmadi');

    const trends = await this.getTrends(id, PeriodType.DAILY, 30);
    const lines = await this.getLines({ regionId: id, limit: 100 });

    return { region, trends, lines: lines.items };
  }

  async getTrends(
    regionId?: string,
    periodType: PeriodType = PeriodType.DAILY,
    days = 30,
  ) {
    const params: unknown[] = [periodType, days];
    let regionFilter = 'AND a.line_id IS NULL';
    if (regionId) {
      params.push(regionId);
      regionFilter += ` AND a.region_id = $3`;
    }

    const rows = await this.db.many(
      `SELECT
         a.period_start,
         SUM(a.water_used_liters) AS water_used,
         SUM(a.water_saved_liters) AS water_saved,
         AVG(a.plant_health_score) AS plant_health_score,
         AVG(a.avg_soil_moisture) AS avg_soil_moisture
       FROM aggregated_stats a
       WHERE a.period_type = $1
         AND a.period_start >= date_trunc('day', NOW()) - ($2 || ' days')::interval
         ${regionFilter}
       GROUP BY a.period_start
       ORDER BY a.period_start ASC`,
      params,
    );

    return rows.map((r) => ({
      periodStart: r.period_start,
      waterUsedM3: Number(r.water_used) / 1000,
      waterSavedM3: Number(r.water_saved) / 1000,
      plantHealthScore: Math.round(Number(r.plant_health_score) * 10) / 10,
      avgSoilMoisture: Math.round(Number(r.avg_soil_moisture) * 10) / 10,
    }));
  }

  async getLines(opts: {
    regionId?: string;
    q?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const where: string[] = [];

    if (opts.regionId) {
      params.push(opts.regionId);
      where.push(
        `(l.region_id = $${params.length} OR l.region_id IN (SELECT id FROM regions WHERE parent_id = $${params.length}))`,
      );
    }
    if (opts.q) {
      params.push(`%${opts.q}%`);
      where.push(`(l.code ILIKE $${params.length} OR r.name ILIKE $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sortMap: Record<string, string> = {
      code: 'l.code',
      region: 'r.name',
      length: 'l.length_meters',
      health: 'health_score',
      saved: 'saved_pct',
    };
    const sortCol = sortMap[opts.sort ?? 'code'] ?? 'l.code';

    const countRow = await this.db.one<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM irrigation_lines l
       JOIN regions r ON r.id = l.region_id
       ${whereSql}`,
      params,
    );

    params.push(limit, offset);
    const rows = await this.db.many(
      `SELECT
         l.id, l.code, l.length_meters, l.plant_type, l.status, l.updated_at,
         r.id AS region_id, r.name AS region_name,
         COALESCE(AVG(a.water_used_liters), 0) AS avg_water_used,
         COALESCE(AVG(a.water_saved_liters), 0) AS avg_water_saved,
         COALESCE(AVG(a.plant_health_score), 0) AS health_score,
         CASE
           WHEN COALESCE(AVG(a.water_used_liters), 0) + COALESCE(AVG(a.water_saved_liters), 0) > 0
           THEN (AVG(a.water_saved_liters) / (AVG(a.water_used_liters) + AVG(a.water_saved_liters))) * 100
           ELSE 0
         END AS saved_pct
       FROM irrigation_lines l
       JOIN regions r ON r.id = l.region_id
       LEFT JOIN aggregated_stats a
         ON a.line_id = l.id
         AND a.period_type = 'daily'
         AND a.period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'
       ${whereSql}
       GROUP BY l.id, r.id, r.name
       ORDER BY ${sortCol} ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      total: Number(countRow?.count ?? 0),
      page,
      limit,
      items: rows.map((r) => ({
        id: r.id,
        code: r.code,
        regionId: r.region_id,
        regionName: r.region_name,
        lengthMeters: Number(r.length_meters),
        plantType: r.plant_type,
        status: r.status,
        avgWaterUsedM3: Number(r.avg_water_used) / 1000,
        waterSavedPercent: Math.round(Number(r.saved_pct) * 10) / 10,
        plantHealthScore: Math.round(Number(r.health_score) * 10) / 10,
        plantHealthLevel: plantHealthFromScore(Number(r.health_score)),
        updatedAt: r.updated_at,
      })),
    };
  }

  async getLineDetail(id: string) {
    const detail = await this.db.one(
      `SELECT
         l.id, l.code, l.length_meters, l.plant_type, l.status, l.updated_at,
         r.id AS region_id, r.name AS region_name,
         COALESCE(AVG(a.water_used_liters), 0) AS avg_water_used,
         COALESCE(AVG(a.water_saved_liters), 0) AS avg_water_saved,
         COALESCE(AVG(a.plant_health_score), 0) AS health_score,
         CASE
           WHEN COALESCE(AVG(a.water_used_liters), 0) + COALESCE(AVG(a.water_saved_liters), 0) > 0
           THEN (AVG(a.water_saved_liters) / (AVG(a.water_used_liters) + AVG(a.water_saved_liters))) * 100
           ELSE 0
         END AS saved_pct
       FROM irrigation_lines l
       JOIN regions r ON r.id = l.region_id
       LEFT JOIN aggregated_stats a
         ON a.line_id = l.id AND a.period_type = 'daily'
         AND a.period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'
       WHERE l.id = $1
       GROUP BY l.id, r.id, r.name`,
      [id],
    );

    if (!detail) throw new NotFoundException('Liniya topilmadi');

    const trends = await this.db.many(
      `SELECT period_start, water_used_liters, water_saved_liters, plant_health_score
       FROM aggregated_stats
       WHERE line_id = $1 AND period_type = 'daily'
         AND period_start >= date_trunc('day', NOW()) - INTERVAL '30 days'
       ORDER BY period_start ASC`,
      [id],
    );

    return {
      id: detail.id,
      code: detail.code,
      regionId: detail.region_id,
      regionName: detail.region_name,
      lengthMeters: Number(detail.length_meters),
      plantType: detail.plant_type,
      status: detail.status,
      avgWaterUsedM3: Number(detail.avg_water_used) / 1000,
      waterSavedPercent: Math.round(Number(detail.saved_pct) * 10) / 10,
      plantHealthScore: Math.round(Number(detail.health_score) * 10) / 10,
      plantHealthLevel: plantHealthFromScore(Number(detail.health_score)),
      updatedAt: detail.updated_at,
      trends: trends.map((t) => ({
        periodStart: t.period_start,
        waterUsedM3: Number(t.water_used_liters) / 1000,
        waterSavedM3: Number(t.water_saved_liters) / 1000,
        plantHealthScore: Math.round(Number(t.plant_health_score) * 10) / 10,
      })),
    };
  }

  async getPlantHealth(regionId?: string) {
    const regions = await this.getRegionComparison();
    const filtered = regionId
      ? regions.filter((r) => r.id === regionId)
      : regions;

    const overview = await this.getOverview(regionId);
    const scores = filtered.map((r) => r.plantHealthScore);
    const buckets = { good: 0, average: 0, poor: 0 };
    for (const r of filtered) {
      buckets[r.plantHealthLevel as keyof typeof buckets]++;
    }
    const total = filtered.length || 1;

    const sorted = [...filtered].sort(
      (a, b) => b.plantHealthScore - a.plantHealthScore,
    );

    return {
      score: overview.plantHealthScore,
      level: overview.plantHealthLevel,
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
      regions: filtered,
    };
  }

  async getWaterSavings(opts: {
    regionId?: string;
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    days?: number;
  }) {
    const period = opts.period ?? 'daily';
    const days =
      opts.days ??
      (period === 'yearly' ? 365 : period === 'monthly' ? 90 : period === 'weekly' ? 28 : 30);

    const periodType =
      period === 'monthly' || period === 'yearly'
        ? PeriodType.MONTHLY
        : PeriodType.DAILY;

    const trends = await this.getTrends(opts.regionId, periodType, days);
    const overview = await this.getOverview(opts.regionId);
    const regions = await this.getRegionComparison();

    const ranking = regions
      .map((r) => ({
        id: r.id,
        name: r.name,
        waterSavedM3: r.waterSavedM3,
        waterSavedPercent: r.waterSavedPercent,
        plantHealthLevel: r.plantHealthLevel,
      }))
      .sort((a, b) => b.waterSavedM3 - a.waterSavedM3);

    return {
      period,
      totalSavedM3: overview.waterSavedM3,
      totalUsedM3: overview.waterUsedM3,
      savedPercent: overview.waterSavedPercent,
      trends,
      ranking,
    };
  }
}
