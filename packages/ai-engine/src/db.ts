/**
 * Singleton PostgreSQL connection pool.
 * All handlers import from here — one pool shared across the process.
 */

import { Pool } from 'pg';
import { createLogger } from '@mawazo/shared';

const logger = createLogger('ai-engine:db');

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
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
