import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RegionsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.many(
      `SELECT
         id, name, parent_id, level,
         ST_AsGeoJSON(boundary)::json AS boundary,
         created_at
       FROM regions
       ORDER BY level, name`,
    );
  }

  async findTree() {
    const regions = await this.findAll();
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const r of regions) {
      map.set(r.id, { ...r, children: [] });
    }
    for (const r of regions) {
      const node = map.get(r.id);
      if (r.parent_id && map.has(r.parent_id)) {
        map.get(r.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findOne(id: string) {
    const region = await this.db.one(
      `SELECT
         id, name, parent_id, level,
         ST_AsGeoJSON(boundary)::json AS boundary,
         created_at
       FROM regions WHERE id = $1`,
      [id],
    );
    if (!region) throw new NotFoundException('Hudud topilmadi');
    return region;
  }

  async findLinesByRegion(id: string) {
    await this.findOne(id);
    return this.db.many(
      `SELECT
         l.id, l.code, l.region_id, l.plant_type, l.irrigation_type,
         l.length_meters, l.installed_date, l.status,
         l.irrigation_mode, l.irrigation_on, l.design_plan_url,
         ST_AsGeoJSON(l.geometry)::json AS geometry,
         ST_X(ST_Centroid(l.geometry)) AS center_lng,
         ST_Y(ST_Centroid(l.geometry)) AS center_lat
       FROM irrigation_lines l
       WHERE l.region_id = $1
          OR l.region_id IN (SELECT id FROM regions WHERE parent_id = $1)
       ORDER BY l.code`,
      [id],
    );
  }
}
