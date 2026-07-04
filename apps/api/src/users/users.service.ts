import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@suv/shared';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.many(
      `SELECT u.id, u.full_name, u.phone, u.role, u.region_id, u.is_active, u.created_at,
              r.name AS region_name
       FROM users u
       LEFT JOIN regions r ON r.id = u.region_id
       ORDER BY u.created_at DESC`,
    );
  }

  async create(data: {
    fullName: string;
    phone: string;
    password: string;
    role: UserRole;
    regionId?: string;
  }) {
    const hash = await bcrypt.hash(data.password, 10);
    try {
      return await this.db.one(
        `INSERT INTO users (full_name, phone, password_hash, role, region_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, full_name, phone, role, region_id, is_active, created_at`,
        [
          data.fullName,
          data.phone,
          hash,
          data.role,
          data.regionId ?? null,
        ],
      );
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('Bu telefon raqam allaqachon mavjud');
      }
      throw err;
    }
  }

  async update(
    id: string,
    data: Partial<{
      fullName: string;
      role: UserRole;
      regionId: string | null;
      isActive: boolean;
    }>,
  ) {
    const user = await this.db.one('SELECT id FROM users WHERE id = $1', [id]);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    return this.db.one(
      `UPDATE users SET
         full_name = COALESCE($2, full_name),
         role = COALESCE($3, role),
         region_id = COALESCE($4, region_id),
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, full_name, phone, role, region_id, is_active, created_at`,
      [
        id,
        data.fullName ?? null,
        data.role ?? null,
        data.regionId === undefined ? null : data.regionId,
        data.isActive ?? null,
      ],
    );
  }
}
