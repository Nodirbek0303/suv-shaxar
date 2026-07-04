import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SensorType } from '@suv/shared';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../common/audit.service';
import {
  CreateLineDto,
  IrrigationControlDto,
  UpdateLineDto,
} from './dto/line.dto';

@Injectable()
export class LinesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private mapLine(row: any) {
    return {
      id: row.id,
      code: row.code,
      regionId: row.region_id,
      regionName: row.region_name,
      plantType: row.plant_type,
      irrigationType: row.irrigation_type,
      lengthMeters: row.length_meters,
      installedDate: row.installed_date,
      status: row.status,
      irrigationMode: row.irrigation_mode,
      irrigationOn: row.irrigation_on,
      designPlanUrl: row.design_plan_url,
      geometry: row.geometry,
      centerLng: row.center_lng,
      centerLat: row.center_lat,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sensors: row.sensors,
    };
  }

  private coordsToWkt(coords: { lng: number; lat: number }[]): string {
    const points = coords.map((c) => `${c.lng} ${c.lat}`).join(', ');
    return `LINESTRING(${points})`;
  }

  async findAll(regionId?: string) {
    const params: unknown[] = [];
    let where = '';
    if (regionId) {
      params.push(regionId);
      where = `WHERE l.region_id = $1 OR l.region_id IN (SELECT id FROM regions WHERE parent_id = $1)`;
    }

    const rows = await this.db.many(
      `SELECT
         l.*,
         r.name AS region_name,
         ST_AsGeoJSON(l.geometry)::json AS geometry,
         ST_X(ST_Centroid(l.geometry)) AS center_lng,
         ST_Y(ST_Centroid(l.geometry)) AS center_lat
       FROM irrigation_lines l
       JOIN regions r ON r.id = l.region_id
       ${where}
       ORDER BY l.code`,
      params,
    );
    return rows.map((r) => this.mapLine(r));
  }

  async findOne(id: string) {
    const row = await this.db.one(
      `SELECT
         l.*,
         r.name AS region_name,
         ST_AsGeoJSON(l.geometry)::json AS geometry,
         ST_X(ST_Centroid(l.geometry)) AS center_lng,
         ST_Y(ST_Centroid(l.geometry)) AS center_lat
       FROM irrigation_lines l
       JOIN regions r ON r.id = l.region_id
       WHERE l.id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException('Liniya topilmadi');

    const sensors = await this.db.many(
      `SELECT
         s.id, s.type, s.serial_number, s.last_seen_at,
         (
           SELECT json_build_object('value', sr.value, 'unit', sr.unit, 'recorded_at', sr.recorded_at)
           FROM sensor_readings sr
           WHERE sr.sensor_id = s.id
           ORDER BY sr.recorded_at DESC
           LIMIT 1
         ) AS last_reading
       FROM sensors s
       WHERE s.line_id = $1
       ORDER BY s.type`,
      [id],
    );

    return this.mapLine({ ...row, sensors });
  }

  async create(dto: CreateLineDto, userId: string) {
    if (dto.coordinates.length < 2) {
      throw new ConflictException('Kamida 2 ta nuqta kerak');
    }

    try {
      const row = await this.db.one(
        `INSERT INTO irrigation_lines
           (code, region_id, geometry, plant_type, irrigation_type, length_meters, installed_date, status)
         VALUES
           ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6, $7, COALESCE($8, 'active'))
         RETURNING id`,
        [
          dto.code,
          dto.regionId,
          this.coordsToWkt(dto.coordinates),
          dto.plantType,
          dto.irrigationType ?? 'drip',
          dto.lengthMeters ?? 0,
          dto.installedDate ?? null,
          dto.status ?? null,
        ],
      );

      const lineId = (row as { id: string }).id;

      for (const type of Object.values(SensorType)) {
        await this.db.query(
          `INSERT INTO sensors (line_id, type, serial_number)
           VALUES ($1, $2, $3)`,
          [lineId, type, `${dto.code}-${type.slice(0, 2).toUpperCase()}`],
        );
      }

      await this.audit.log({
        userId,
        action: 'create',
        entityType: 'irrigation_line',
        entityId: lineId,
        details: { code: dto.code },
      });

      return this.findOne(lineId);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('Bu liniya kodi allaqachon mavjud');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateLineDto, userId: string) {
    await this.findOne(id);

    const fields: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    const set = (col: string, value: unknown) => {
      fields.push(`${col} = $${i++}`);
      params.push(value);
    };

    if (dto.regionId !== undefined) set('region_id', dto.regionId);
    if (dto.plantType !== undefined) set('plant_type', dto.plantType);
    if (dto.irrigationType !== undefined) set('irrigation_type', dto.irrigationType);
    if (dto.lengthMeters !== undefined) set('length_meters', dto.lengthMeters);
    if (dto.installedDate !== undefined) set('installed_date', dto.installedDate);
    if (dto.status !== undefined) set('status', dto.status);
    if (dto.irrigationMode !== undefined) set('irrigation_mode', dto.irrigationMode);
    if (dto.irrigationOn !== undefined) set('irrigation_on', dto.irrigationOn);
    if (dto.designPlanUrl !== undefined) set('design_plan_url', dto.designPlanUrl);
    if (dto.coordinates !== undefined) {
      fields.push(`geometry = ST_GeomFromText($${i++}, 4326)`);
      params.push(this.coordsToWkt(dto.coordinates));
    }

    if (fields.length === 0) return this.findOne(id);

    fields.push('updated_at = NOW()');
    params.push(id);

    await this.db.query(
      `UPDATE irrigation_lines SET ${fields.join(', ')} WHERE id = $${i}`,
      params,
    );

    await this.audit.log({
      userId,
      action: 'update',
      entityType: 'irrigation_line',
      entityId: id,
      details: dto as Record<string, unknown>,
    });

    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const line = await this.findOne(id);
    const code = line.code;
    await this.db.query('DELETE FROM irrigation_lines WHERE id = $1', [id]);
    await this.audit.log({
      userId,
      action: 'delete',
      entityType: 'irrigation_line',
      entityId: id,
      details: { code },
    });
    return { success: true };
  }

  async controlIrrigation(id: string, dto: IrrigationControlDto, userId: string) {
    return this.update(
      id,
      {
        irrigationOn: dto.irrigationOn,
        irrigationMode: dto.irrigationMode,
      },
      userId,
    );
  }

  async getHistory(id: string, sensorType?: string, hours = 24) {
    await this.findOne(id);
    const params: unknown[] = [id, hours];
    let typeFilter = '';
    if (sensorType) {
      params.push(sensorType);
      typeFilter = `AND s.type = $3`;
    }

    return this.db.many(
      `SELECT
         s.type AS sensor_type,
         sr.value,
         sr.unit,
         sr.recorded_at
       FROM sensor_readings sr
       JOIN sensors s ON s.id = sr.sensor_id
       WHERE s.line_id = $1
         AND sr.recorded_at >= NOW() - ($2 || ' hours')::interval
         ${typeFilter}
       ORDER BY sr.recorded_at ASC`,
      params,
    );
  }
}
