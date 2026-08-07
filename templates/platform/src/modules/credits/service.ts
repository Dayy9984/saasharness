import type { Env } from '../../platform/env';
import { database, isInsufficientCredits, type SqlDatabase } from '../../platform/database';
import { sha256Hex } from '../../platform/crypto';

/**
 * Ported to the Cloudflare database boundary from
 * nikandr-surkov/ai-saas-starter/src/lib/credits/index.ts (MIT).
 *
 * Invariants:
 * - credit_ledger is append-only;
 * - idempotency replay is a no-op only when every operation field matches;
 * - a spend is one atomic conditional balance update, never check-then-write;
 * - a refund derives its amount from the original spend, never from the caller.
 */
export class InsufficientCreditsError extends Error {
  constructor(message = 'Insufficient credits') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

export interface CreditMutation {
  userId: string;
  amount: number;
  reason: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  actorId?: string | null;
}

export interface CreditRefund {
  userId: string;
  originalSpendIdempotencyKey: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  actorId?: string | null;
}

export interface CreditLedgerEntry {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  reference_type: string;
  reference_id: string;
  idempotency_key: string;
  actor_id: string | null;
  created_at: number;
}

function validateMutation(input: CreditMutation) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error('credit amount must be a positive safe integer');
  }
  if (!input.userId || !input.idempotencyKey) {
    throw new Error('userId and idempotencyKey are required');
  }
  if (!input.reason || !input.referenceType || !input.referenceId) {
    throw new Error('reason, referenceType, and referenceId are required');
  }
}

async function entryByKey(db: SqlDatabase, idempotencyKey: string) {
  return db.first<CreditLedgerEntry>(
    'SELECT id, user_id, delta, reason, reference_type, reference_id, idempotency_key, actor_id, created_at FROM credit_ledger WHERE idempotency_key = ?',
    [idempotencyKey],
  );
}

function assertSameOperation(existing: CreditLedgerEntry | null, input: CreditMutation, delta: number) {
  const same = existing
    && existing.user_id === input.userId
    && Number(existing.delta) === delta
    && existing.reason === input.reason
    && existing.reference_type === input.referenceType
    && existing.reference_id === input.referenceId;
  if (!same) {
    throw new Error(`credits: idempotency key collision on ${input.idempotencyKey}`);
  }
}

async function auditId(input: CreditMutation, delta: number) {
  return 'audit_credit_' + await sha256Hex(`${input.idempotencyKey}:${delta}`);
}

async function recordAudit(db: SqlDatabase, input: CreditMutation, delta: number, timestamp: number) {
  const sql = db.kind === 'd1'
    ? 'INSERT OR IGNORE INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    : 'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING';
  await db.run(sql, [
    await auditId(input, delta),
    input.actorId ?? input.userId,
    input.userId,
    delta > 0 ? 'credits.grant' : 'credits.spend',
    JSON.stringify({
      delta,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
    }),
    timestamp,
  ]);
}

async function mutateD1(db: SqlDatabase, input: CreditMutation, delta: number) {
  const timestamp = Date.now();
  const inserted = await db.run(
    'INSERT OR IGNORE INTO credit_ledger(id, user_id, delta, reason, reference_type, reference_id, idempotency_key, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      crypto.randomUUID(),
      input.userId,
      delta,
      input.reason,
      input.referenceType,
      input.referenceId,
      input.idempotencyKey,
      input.actorId ?? null,
      timestamp,
    ],
  ).catch((error) => {
    if (isInsufficientCredits(error)) throw new InsufficientCreditsError();
    throw error;
  });

  const replayed = inserted.changes === 0;
  if (replayed) assertSameOperation(await entryByKey(db, input.idempotencyKey), input, delta);
  await recordAudit(db, input, delta, timestamp);
  return { balance: await getCreditBalanceFromDb(db, input.userId), replayed };
}

async function mutatePostgres(db: SqlDatabase, input: CreditMutation, delta: number) {
  return db.transaction(async (tx) => {
    const timestamp = Date.now();
    const inserted = await tx.all<{ id: string }>(
      'INSERT INTO credit_ledger(id, user_id, delta, reason, reference_type, reference_id, idempotency_key, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id',
      [
        crypto.randomUUID(),
        input.userId,
        delta,
        input.reason,
        input.referenceType,
        input.referenceId,
        input.idempotencyKey,
        input.actorId ?? null,
        timestamp,
      ],
    );
    if (inserted.length === 0) {
      assertSameOperation(await entryByKey(tx, input.idempotencyKey), input, delta);
      await recordAudit(tx, input, delta, timestamp);
      return { balance: await getCreditBalanceFromDb(tx, input.userId), replayed: true };
    }

    const updated = await tx.run(
      'UPDATE credit_account SET balance = balance + ?, updated_at = ? WHERE user_id = ? AND balance + ? >= 0',
      [delta, timestamp, input.userId, delta],
    );
    if (updated.changes !== 1) {
      if (delta < 0) throw new InsufficientCreditsError();
      throw new Error('credit account not found');
    }
    await recordAudit(tx, input, delta, timestamp);
    return { balance: await getCreditBalanceFromDb(tx, input.userId), replayed: false };
  });
}

async function mutate(env: Env, input: CreditMutation, delta: number) {
  validateMutation(input);
  const db = database(env);
  return db.kind === 'd1'
    ? mutateD1(db, input, delta)
    : mutatePostgres(db, input, delta);
}

async function getCreditBalanceFromDb(db: SqlDatabase, userId: string): Promise<number> {
  const row = await db.first<{ balance: number | string }>(
    'SELECT balance FROM credit_account WHERE user_id = ?',
    [userId],
  );
  if (!row) throw new Error('credit account not found');
  return Number(row.balance);
}

export async function getCreditBalance(env: Env, userId: string): Promise<number> {
  return getCreditBalanceFromDb(database(env), userId);
}

export async function getCreditHistory(env: Env, userId: string, limit = 50): Promise<CreditLedgerEntry[]> {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
  const rows = await database(env).all<CreditLedgerEntry>(
    `SELECT id, user_id, delta, reason, reference_type, reference_id, idempotency_key, actor_id, created_at
     FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [userId, safeLimit],
  );
  return rows.map((row) => ({ ...row, delta: Number(row.delta), created_at: Number(row.created_at) }));
}

export async function reconcileCreditBalance(env: Env, userId: string) {
  const db = database(env);
  const account = await getCreditBalanceFromDb(db, userId);
  const row = await db.first<{ ledger_balance: number | string | null }>(
    'SELECT COALESCE(SUM(delta), 0) AS ledger_balance FROM credit_ledger WHERE user_id = ?',
    [userId],
  );
  const ledger = Number(row?.ledger_balance ?? 0);
  return { account, ledger, consistent: account === ledger };
}

export const grantCredits = (env: Env, input: CreditMutation) => mutate(env, input, input.amount);
export const spendCredits = (env: Env, input: CreditMutation) => mutate(env, input, -input.amount);

export async function refundCredits(env: Env, input: CreditRefund) {
  if (!input.originalSpendIdempotencyKey || !input.idempotencyKey) {
    throw new Error('originalSpendIdempotencyKey and idempotencyKey are required');
  }
  const original = await entryByKey(database(env), input.originalSpendIdempotencyKey);
  if (!original || original.user_id !== input.userId || Number(original.delta) >= 0) {
    throw new Error('refundCredits: matching original spend was not found');
  }
  return mutate(env, {
    userId: input.userId,
    amount: Math.abs(Number(original.delta)),
    reason: 'refund',
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    idempotencyKey: input.idempotencyKey,
    actorId: input.actorId,
  }, Math.abs(Number(original.delta)));
}
