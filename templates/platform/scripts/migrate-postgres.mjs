import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL migrations');

const root = process.cwd();
const migrationDir = path.join(root, 'migrations', 'postgres');
const files = (await readdir(migrationDir))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort((left, right) => left.localeCompare(right, 'en'));
if (files.length === 0) throw new Error(`no PostgreSQL migrations found in ${migrationDir}`);

const pool = new Pool({ connectionString, max: 1, allowExitOnIdle: true });
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(hashtext('saasharness-migrations'))");
  await client.query(`CREATE TABLE IF NOT EXISTS _saasharness_migration (
    name TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  for (const name of files) {
    const sql = await readFile(path.join(migrationDir, name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const existing = await client.query(
      'SELECT checksum FROM _saasharness_migration WHERE name = $1',
      [name],
    );
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`applied migration was modified: ${name}`);
      }
      console.log(JSON.stringify({ migration: name, status: 'already-applied', checksum }));
      continue;
    }

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO _saasharness_migration(name, checksum) VALUES ($1, $2)',
        [name, checksum],
      );
      await client.query('COMMIT');
      console.log(JSON.stringify({ migration: name, status: 'applied', checksum }));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('saasharness-migrations'))").catch(() => undefined);
  client.release();
  await pool.end();
}
