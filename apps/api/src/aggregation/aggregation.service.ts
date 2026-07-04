import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

/**
 * Aggregates raw sensor_readings into aggregated_stats for Hokimiyat panel.
 * Traditional irrigation baseline assumed ~35% more water than drip.
 */
@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);
  private readonly TRADITIONAL_FACTOR = 1.35;

  constructor(private readonly db: DatabaseService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourly() {
    await this.runAggregation('hourly', "date_trunc('hour', NOW()) - INTERVAL '1 hour'");
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async aggregateDaily() {
    await this.runAggregation('daily', "date_trunc('day', NOW()) - INTERVAL '1 day'");
  }

  /** Manual trigger for demos / backfill. */
  async runNow(periodType: 'hourly' | 'daily' | 'monthly' = 'daily') {
    const periodExpr =
      periodType === 'hourly'
        ? "date_trunc('hour', NOW())"
        : periodType === 'monthly'
          ? "date_trunc('month', NOW())"
          : "date_trunc('day', NOW())";
    await this.runAggregation(periodType, periodExpr);
    return { success: true, periodType };
  }

  private async runAggregation(periodType: string, periodStartExpr: string) {
    this.logger.log(`Running ${periodType} aggregation...`);

    // Per-line aggregates from water_flow sensors
    await this.db.query(
      `INSERT INTO aggregated_stats
         (region_id, line_id, period_type, period_start,
          water_used_liters, water_saved_liters, avg_soil_moisture,
          plant_health_score, line_count)
       SELECT
         l.region_id,
         l.id,
         $1::period_type,
         ${periodStartExpr},
         COALESCE(flow.total_flow, 0),
         COALESCE(flow.total_flow, 0) * ($2 - 1),
         moisture.avg_m,
         LEAST(100, GREATEST(0,
           COALESCE(moisture.avg_m, 50) * 0.7 +
           CASE WHEN COALESCE(temp.avg_t, 25) BETWEEN 15 AND 32 THEN 30 ELSE 10 END
         )),
         1
       FROM irrigation_lines l
       LEFT JOIN LATERAL (
         SELECT SUM(sr.value) AS total_flow
         FROM sensors s
         JOIN sensor_readings sr ON sr.sensor_id = s.id
         WHERE s.line_id = l.id AND s.type = 'water_flow'
           AND sr.recorded_at >= ${periodStartExpr}
           AND sr.recorded_at < ${periodStartExpr} +
             CASE $1
               WHEN 'hourly' THEN INTERVAL '1 hour'
               WHEN 'monthly' THEN INTERVAL '1 month'
               ELSE INTERVAL '1 day'
             END
       ) flow ON TRUE
       LEFT JOIN LATERAL (
         SELECT AVG(sr.value) AS avg_m
         FROM sensors s
         JOIN sensor_readings sr ON sr.sensor_id = s.id
         WHERE s.line_id = l.id AND s.type = 'soil_moisture'
           AND sr.recorded_at >= ${periodStartExpr}
           AND sr.recorded_at < ${periodStartExpr} +
             CASE $1
               WHEN 'hourly' THEN INTERVAL '1 hour'
               WHEN 'monthly' THEN INTERVAL '1 month'
               ELSE INTERVAL '1 day'
             END
       ) moisture ON TRUE
       LEFT JOIN LATERAL (
         SELECT AVG(sr.value) AS avg_t
         FROM sensors s
         JOIN sensor_readings sr ON sr.sensor_id = s.id
         WHERE s.line_id = l.id AND s.type = 'temperature'
           AND sr.recorded_at >= ${periodStartExpr}
           AND sr.recorded_at < ${periodStartExpr} +
             CASE $1
               WHEN 'hourly' THEN INTERVAL '1 hour'
               WHEN 'monthly' THEN INTERVAL '1 month'
               ELSE INTERVAL '1 day'
             END
       ) temp ON TRUE
       ON CONFLICT (region_id, line_id, period_type, period_start)
       DO UPDATE SET
         water_used_liters = EXCLUDED.water_used_liters,
         water_saved_liters = EXCLUDED.water_saved_liters,
         avg_soil_moisture = EXCLUDED.avg_soil_moisture,
         plant_health_score = EXCLUDED.plant_health_score`,
      [periodType, this.TRADITIONAL_FACTOR],
    );

    // Region-level rollup (line_id NULL)
    await this.db.query(
      `INSERT INTO aggregated_stats
         (region_id, line_id, period_type, period_start,
          water_used_liters, water_saved_liters, avg_soil_moisture,
          plant_health_score, line_count)
       SELECT
         region_id,
         NULL,
         period_type,
         period_start,
         SUM(water_used_liters),
         SUM(water_saved_liters),
         AVG(avg_soil_moisture),
         AVG(plant_health_score),
         COUNT(*)::int
       FROM aggregated_stats
       WHERE period_type = $1::period_type
         AND line_id IS NOT NULL
         AND period_start = ${periodStartExpr}
       GROUP BY region_id, period_type, period_start
       ON CONFLICT (region_id, line_id, period_type, period_start)
       DO UPDATE SET
         water_used_liters = EXCLUDED.water_used_liters,
         water_saved_liters = EXCLUDED.water_saved_liters,
         avg_soil_moisture = EXCLUDED.avg_soil_moisture,
         plant_health_score = EXCLUDED.plant_health_score,
         line_count = EXCLUDED.line_count`,
      [periodType],
    );

    this.logger.log(`${periodType} aggregation done`);
  }
}
