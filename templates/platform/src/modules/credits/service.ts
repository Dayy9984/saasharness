import type { Env } from '../../platform/env';

export interface CreditMutation {
  userId: string;
  amount: number;
  reason: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  actorId?: string | null;
}

function validate(input: CreditMutation) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error('credit amount must be a positive integer');
  }
  if (!input.idempotencyKey) throw new Error('idempotencyKey is required');
  if (!input.reason || !input.referenceType || !input.referenceId) {
    throw new Error('reason, referenceType, and referenceId are required');
  }
}

async function replay(env: Env, input: CreditMutation, delta: number) {
  const existing = await env.DB.prepare(
    'SELECT user_id, delta, reason, reference_type, reference_id FROM credit_ledger WHERE idempotency_key = ?',
  ).bind(input.idempotencyKey).first<{
    user_id: string;
    delta: number;
    reason: string;
    reference_type: string;
    reference_id: string;
  }>();
  if (!existing) return null;
  const same = existing.user_id === input.userId
    && existing.delta === delta
    && existing.reason === input.reason
    && existing.reference_type === input.referenceType
    && existing.reference_id === input.referenceId;
  if (!same) throw new Error('idempotency key reused for a different credit operation');
  return getCreditBalance(env, input.userId);
}

async function mutate(env: Env, input: CreditMutation, delta: number): Promise<{ balance: number; replayed: boolean }> {
  validate(input);
  const previous = await replay(env, input, delta);
  if (previous !== null) return { balance: previous, replayed: true };

  const timestamp = Date.now();
  const ledgerId = crypto.randomUUID();
  try {
    const results = await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO credit_ledger(id, user_id, delta, reason, reference_type, reference_id, idempotency_key, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        ledgerId,
        input.userId,
        delta,
        input.reason,
        input.referenceType,
        input.referenceId,
        input.idempotencyKey,
        input.actorId ?? null,
        timestamp,
      ),
      env.DB.prepare(
        'UPDATE credit_account SET balance = balance + ?, updated_at = ? WHERE user_id = ?',
      ).bind(delta, timestamp, input.userId),
      env.DB.prepare(
        'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).bind(
        crypto.randomUUID(),
        input.actorId ?? input.userId,
        input.userId,
        delta > 0 ? 'credits.grant' : 'credits.spend',
        JSON.stringify({ delta, reason: input.reason, referenceType: input.referenceType, referenceId: input.referenceId }),
        timestamp,
      ),
    ]);
    if ((results[1]?.meta?.changes ?? 0) !== 1) throw new Error('credit account not found');
  } catch (error) {
    const afterFailure = await replay(env, input, delta);
    if (afterFailure !== null) return { balance: afterFailure, replayed: true };
    if (delta < 0) {
      throw new Error('credit spend failed: insufficient balance, missing account, or concurrent conflict');
    }
    throw error;
  }
  return { balance: await getCreditBalance(env, input.userId), replayed: false };
}

export async function getCreditBalance(env: Env, userId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT balance FROM credit_account WHERE user_id = ?')
    .bind(userId).first<{ balance: number }>();
  if (!row) throw new Error('credit account not found');
  return row.balance;
}

export const grantCredits = (env: Env, input: CreditMutation) => mutate(env, input, input.amount);
export const spendCredits = (env: Env, input: CreditMutation) => mutate(env, input, -input.amount);
export const refundCredits = (env: Env, input: CreditMutation) => mutate(env, input, input.amount);
