import { Pool, type PoolClient } from 'pg';
import type { D1DatabaseLike, Env } from './env';

export interface SqlStatement {
  sql: string;
  params?: unknown[];
}

export interface SqlRunResult<T = unknown> {
  changes: number;
  rows: T[];
}

export interface SqlDatabase {
  readonly kind: Env['DATABASE_KIND'];
  run<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<SqlRunResult<T>>;
  first<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  batch(statements: SqlStatement[]): Promise<SqlRunResult[]>;
  transaction<T>(work: (tx: SqlDatabase) => Promise<T>): Promise<T>;
}

function translatePostgresPlaceholders(query: string): string {
  let index = 0;
  let singleQuoted = false;
  let doubleQuoted = false;
  let result = '';
  for (let cursor = 0; cursor < query.length; cursor += 1) {
    const character = query[cursor];
    const previous = query[cursor - 1];
    if (character === "'" && previous !== '\\' && !doubleQuoted) singleQuoted = !singleQuoted;
    if (character === '"' && previous !== '\\' && !singleQuoted) doubleQuoted = !doubleQuoted;
    if (character === '?' && !singleQuoted && !doubleQuoted) {
      index += 1;
      result += '$' + index;
    } else {
      result += character;
    }
  }
  return result;
}

function d1Database(binding: D1DatabaseLike): SqlDatabase {
  const adapter: SqlDatabase = {
    kind: 'd1',
    async run<T>(sql: string, params: unknown[] = []) {
      const result = await binding.prepare(sql).bind(...params).run<T>();
      return {
        changes: Number(result.meta?.changes ?? 0),
        rows: (result.results ?? []) as T[],
      };
    },
    async first<T>(sql: string, params: unknown[] = []) {
      return binding.prepare(sql).bind(...params).first<T>();
    },
    async all<T>(sql: string, params: unknown[] = []) {
      const result = await binding.prepare(sql).bind(...params).all<T>();
      return result.results ?? [];
    },
    async batch(statements: SqlStatement[]) {
      const results = await binding.batch(statements.map((statement) => (
        binding.prepare(statement.sql).bind(...(statement.params ?? []))
      )));
      return results.map((result) => ({
        changes: Number(result.meta?.changes ?? 0),
        rows: result.results ?? [],
      }));
    },
    async transaction<T>(_work: (tx: SqlDatabase) => Promise<T>): Promise<T> {
      throw new Error('D1 does not expose interactive transactions; use one statement, schema triggers, or batch()');
    },
  };
  return adapter;
}

const pools = new Map<string, Pool>();

function poolFor(connectionString: string): Pool {
  const cached = pools.get(connectionString);
  if (cached) return cached;
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
  pool.on('error', (error) => console.error(JSON.stringify({ type: 'postgres_pool_error', message: error.message })));
  pools.set(connectionString, pool);
  return pool;
}

function postgresClient(client: Pool | PoolClient): SqlDatabase {
  const adapter: SqlDatabase = {
    kind: 'postgres-hyperdrive',
    async run<T>(sql: string, params: unknown[] = []) {
      const result = await client.query(translatePostgresPlaceholders(sql), params);
      return { changes: result.rowCount ?? 0, rows: result.rows as T[] };
    },
    async first<T>(sql: string, params: unknown[] = []) {
      const result = await client.query(translatePostgresPlaceholders(sql), params);
      return (result.rows[0] as T | undefined) ?? null;
    },
    async all<T>(sql: string, params: unknown[] = []) {
      const result = await client.query(translatePostgresPlaceholders(sql), params);
      return result.rows as T[];
    },
    async batch(statements: SqlStatement[]) {
      if (!(client instanceof Pool)) {
        const results: SqlRunResult[] = [];
        for (const statement of statements) results.push(await adapter.run(statement.sql, statement.params));
        return results;
      }
      return adapter.transaction(async (tx) => {
        const results: SqlRunResult[] = [];
        for (const statement of statements) results.push(await tx.run(statement.sql, statement.params));
        return results;
      });
    },
    async transaction<T>(work: (tx: SqlDatabase) => Promise<T>) {
      if (!(client instanceof Pool)) return work(adapter);
      const connection = await client.connect();
      try {
        await connection.query('BEGIN');
        const value = await work(postgresClient(connection));
        await connection.query('COMMIT');
        return value;
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      } finally {
        connection.release();
      }
    },
  };
  return adapter;
}

export function database(env: Env): SqlDatabase {
  if (env.DATABASE_KIND === 'd1') {
    if (!env.DB) throw new Error('DATABASE_KIND=d1 requires the DB binding');
    return d1Database(env.DB);
  }
  if (!env.HYPERDRIVE?.connectionString) {
    throw new Error('DATABASE_KIND=postgres-hyperdrive requires the HYPERDRIVE binding');
  }
  return postgresClient(poolFor(env.HYPERDRIVE.connectionString));
}

export function isUniqueViolation(error: unknown): boolean {
  const value = error as { code?: string; message?: string } | null;
  return value?.code === '23505'
    || /unique constraint|UNIQUE constraint failed/i.test(value?.message ?? '');
}

export function isInsufficientCredits(error: unknown): boolean {
  return /insufficient credits/i.test(error instanceof Error ? error.message : String(error));
}
