import { Pool, PoolClient } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseEnvConfig } from './config';

let pgPool: Pool | null = null;

export function getPostgresPool(): Pool | null {
  if (pgPool) return pgPool;

  const { postgresUrl } = getSupabaseEnvConfig();
  if (!postgresUrl) return null;

  pgPool = new Pool({
    connectionString: postgresUrl,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

  return pgPool;
}

/**
 * Runs the database schema migration if tables do not exist yet.
 * Idempotent: uses IF NOT EXISTS and ON CONFLICT DO NOTHING.
 */
export async function runDatabaseMigrations(): Promise<{ success: boolean; message: string }> {
  const pool = getPostgresPool();
  if (!pool) {
    return {
      success: false,
      message: 'Direct Postgres connection unconfigured (BVC_POSTGRES_URL_NON_POOLING not set)',
    };
  }

  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261030000000_bvc_trip_schema.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');

    await client.query(sql);
    return { success: true, message: 'Database schema migration applied successfully' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Migration execution failed: ${msg}` };
  } finally {
    if (client) client.release();
  }
}

