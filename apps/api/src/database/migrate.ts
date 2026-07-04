import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { Pool } from 'pg';

config({ path: resolve(__dirname, '../../../../.env') });

function poolConfig(connectionString: string) {
  const needsSsl =
    /neon\.tech|supabase\.co|sslmode=require/i.test(connectionString);
  return {
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  };
}

async function migrate() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://suv:suv_secret@localhost:5433/suv_shaxar';

  const pool = new Pool(poolConfig(databaseUrl));
  const schemaPath = join(__dirname, 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');

  console.log('Running migrations...');
  await pool.query(sql);
  console.log('Migrations completed.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
