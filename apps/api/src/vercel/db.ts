import { Pool, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in Vercel Environment Variables');
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return getPool().query<T>(text, params);
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  const r = await query<T>(text, params);
  return r.rows[0] ?? null;
}

export async function many<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  const r = await query<T>(text, params);
  return r.rows;
}
