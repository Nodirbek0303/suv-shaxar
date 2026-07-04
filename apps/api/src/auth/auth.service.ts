import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import {
  JwtPayload,
  MONITORING_ROLES,
  OPERATOR_ROLES,
  UserRole,
} from '@suv/shared';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';

interface UserRow {
  id: string;
  full_name: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  region_id: string | null;
  is_active: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.db.one<UserRow>(
      'SELECT * FROM users WHERE phone = $1',
      [dto.phone],
    );

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Telefon yoki parol noto‘g‘ri');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Telefon yoki parol noto‘g‘ri');
    }

    const allowed =
      dto.panel === 'operator'
        ? (OPERATOR_ROLES as readonly UserRole[]).includes(user.role)
        : (MONITORING_ROLES as readonly UserRole[]).includes(user.role);

    if (!allowed) {
      throw new ForbiddenException(
        'Bu foydalanuvchi ushbu panelga kira olmaydi',
      );
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const row = await this.db.one<{
      id: string;
      user_id: string;
      expires_at: Date;
    }>(
      `SELECT id, user_id, expires_at FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    );

    if (!row || new Date(row.expires_at) < new Date()) {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }

    const user = await this.db.one<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
      [row.user_id],
    );
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    await this.db.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [
      tokenHash,
    ]);
    return { success: true };
  }

  async me(userId: string) {
    return this.db.one(
      `SELECT id, full_name, phone, role, region_id, created_at
       FROM users WHERE id = $1`,
      [userId],
    );
  }

  private async issueTokens(user: UserRow) {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      regionId: user.region_id,
      fullName: user.full_name,
    };

    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const days = 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt],
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
      user: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        regionId: user.region_id,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
