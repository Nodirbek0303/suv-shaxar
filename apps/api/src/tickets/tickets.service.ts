import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@suv/shared';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TicketsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(status?: TicketStatus) {
    const params: unknown[] = [];
    let where = '';
    if (status) {
      params.push(status);
      where = 'WHERE t.status = $1';
    }

    return this.db.many(
      `SELECT
         t.id, t.line_id, t.reported_by, t.status, t.description,
         t.created_at, t.resolved_at,
         l.code AS line_code,
         u.full_name AS reported_by_name
       FROM maintenance_tickets t
       JOIN irrigation_lines l ON l.id = t.line_id
       JOIN users u ON u.id = t.reported_by
       ${where}
       ORDER BY t.created_at DESC`,
      params,
    );
  }

  async create(data: { lineId: string; description: string }, userId: string) {
    const line = await this.db.one(
      'SELECT id FROM irrigation_lines WHERE id = $1',
      [data.lineId],
    );
    if (!line) throw new NotFoundException('Liniya topilmadi');

    return this.db.one(
      `INSERT INTO maintenance_tickets (line_id, reported_by, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.lineId, userId, data.description],
    );
  }

  async updateStatus(id: string, status: TicketStatus) {
    const ticket = await this.db.one(
      'SELECT id FROM maintenance_tickets WHERE id = $1',
      [id],
    );
    if (!ticket) throw new NotFoundException('Tiket topilmadi');

    return this.db.one(
      `UPDATE maintenance_tickets
       SET status = $2,
           resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE resolved_at END
       WHERE id = $1
       RETURNING *`,
      [id, status],
    );
  }
}
