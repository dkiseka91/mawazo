/**
 * Mawazo database migration runner.
 * Reads all .sql files from migrations/ and seeds/ in order,
 * applies any that have not been recorded in schema_migrations.
 *
 * Usage: npm run migrate -w packages/database
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('In Railway: go to your service → Variables → Add Reference → DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied(client: PoolClient): Promise<Set<string>> {
  const { rows } = await client.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations'
  );
  return new Set(rows.map((r) => r.filename));
}

async function applyFile(
  client: PoolClient,
  filename: string,
  sql: string
): Promise<void> {
  console.log(`  → Applying ${filename}`);
  await client.query(sql);
  await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
}

async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);

    const migrationsDir = path.join(__dirname, 'migrations');
    const seedsDir      = path.join(__dirname, 'seeds');

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const seedFiles = fs
      .readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log('\nMawazo DB Migration Runner');
    console.log('==========================');

    let count = 0;

    for (const file of migrationFiles) {
      if (applied.has(file)) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await applyFile(client, file, sql);
        await client.query('COMMIT');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to apply migration ${file}: ${(err as Error).message}`);
      }
    }

    for (const file of seedFiles) {
      const key = `seed_${file}`;
      if (applied.has(key)) {
        console.log(`  ✓ ${file} (seed already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await applyFile(client, key, sql);
        await client.query('COMMIT');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to apply seed ${file}: ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Done — ${count} file(s) applied.\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

async function runWithRetry(retries = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await runMigrations();
      return;
    } catch (err) {
      const isConnErr = (err as NodeJS.ErrnoException).code === 'ECONNREFUSED'
        || (err instanceof AggregateError);
      if (isConnErr && attempt < retries) {
        console.log(`  PostgreSQL not ready (attempt ${attempt}/${retries}) — retrying in ${delayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
        delayMs *= 2;
      } else {
        console.error('Migration failed:', (err as Error).message);
        process.exit(1);
      }
    }
  }
}

runWithRetry();
