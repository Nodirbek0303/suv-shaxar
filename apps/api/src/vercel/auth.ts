import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { one, query } from './db';

const JWT_SECRET = () =>
  process.env.JWT_SECRET || 'dev-secret-change-me-in-production';

export function signAccess(payload: object) {
  return jwt.sign(payload, JWT_SECRET(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccess(token: string): any {
  return jwt.verify(token, JWT_SECRET());
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function login(phone: string, password: string, panel: string) {
  const user = await one<any>('SELECT * FROM users WHERE phone = $1', [phone]);
  if (!user || !user.is_active) {
    throw Object.assign(new Error('Telefon yoki parol noto‘g‘ri'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Telefon yoki parol noto‘g‘ri'), { status: 401 });
  }

  const operatorRoles = [
    'obodonlashtirish_admin',
    'obodonlashtirish_operator',
  ];
  const monitoringRoles = ['hokimiyat_viewer'];
  const allowed =
    panel === 'operator'
      ? operatorRoles.includes(user.role)
      : monitoringRoles.includes(user.role);

  if (!allowed) {
    throw Object.assign(new Error('Bu foydalanuvchi ushbu panelga kira olmaydi'), {
      status: 403,
    });
  }

  return issueTokens(user);
}

async function issueTokens(user: any) {
  const payload = {
    sub: user.id,
    role: user.role,
    regionId: user.region_id,
    fullName: user.full_name,
  };

  const accessToken = signAccess(payload);
  const refreshToken = randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(refreshToken), expiresAt],
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    user: {
      id: user.id,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
      regionId: user.region_id,
    },
  };
}

export async function refreshTokenFlow(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const row = await one<any>(
    `SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  if (!row || new Date(row.expires_at) < new Date()) {
    throw Object.assign(new Error('Refresh token yaroqsiz'), { status: 401 });
  }

  const user = await one<any>(
    'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
    [row.user_id],
  );
  if (!user) {
    throw Object.assign(new Error('Foydalanuvchi topilmadi'), { status: 401 });
  }

  await query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
  return issueTokens(user);
}

export async function logout(refreshToken: string) {
  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [
    hashToken(refreshToken),
  ]);
  return { success: true };
}

export function getBearer(req: { headers: Record<string, unknown> }) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (typeof h !== 'string' || !h.startsWith('Bearer ')) return null;
  return h.slice(7);
}

export function requireUser(req: any) {
  const token = getBearer(req);
  if (!token) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  try {
    return verifyAccess(token);
  } catch {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
}

export function requireRoles(user: any, roles: string[]) {
  if (!roles.includes(user.role)) {
    throw Object.assign(new Error('Bu amal uchun ruxsat yo‘q'), { status: 403 });
  }
}
