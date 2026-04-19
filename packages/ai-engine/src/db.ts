/**
 * Singleton PostgreSQL connection pool.
 * All handlers import from here — one pool shared across the process.
 */

import { Pool } from 'pg';
import { createLogger } from '@mawazo/shared';

const logger = createLogger('ai-engine:db');

let pool: Pool | null = null;

function requiresSsl(url: string): boolean {
  return !url.includes('localhost') && !url.includes('127.0.0.1');
}

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL ?? '';
    pool = new Pool({
      connectionString: url,
      ssl: requiresSsl(url) ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
    });

    pool.on('connect', () => {
      logger.debug('PostgreSQL client connected');
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
