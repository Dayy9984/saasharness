import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../src/platform/env';
import {
  getCreditBalance,
  grantCredits,
  InsufficientCreditsError,
  reconcileCreditBalance,
  refundCredits,
  spendCredits,
} from '../src/modules/credits/public';

const testEnv = env as Env;
let sequence = 0;
let userId = '';

beforeEach(async () => {
  sequence += 1;
  userId = `user_credits_${sequence}_${crypto.randomUUID()}`;
  const now = Date.now();
  await env.DB!.batch([
    env.DB!.prepare('INSERT INTO app_user(id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, `credits-${sequence}@example.test`, 'Credits Test', now, now),
    env.DB!.prepare('INSERT INTO credit_account(user_id, balance, updated_at) VALUES (?, 0, ?)')
      .bind(userId, now),
  ]);
});

function mutation(idempotencyKey: string, amount: number, reason = 'test') {
  const scopedKey = `${userId}:${idempotencyKey}`;
  return {
    userId,
    amount,
    reason,
    referenceType: 'test',
    referenceId: scopedKey,
    idempotencyKey: scopedKey,
    actorId: userId,
  };
}

describe('credits ledger invariants', () => {
  it('replays an identical grant once and rejects a key collision', async () => {
    const first = await grantCredits(testEnv, mutation('grant-1', 10));
    const replay = await grantCredits(testEnv, mutation('grant-1', 10));
    expect(first).toEqual({ balance: 10, replayed: false });
    expect(replay).toEqual({ balance: 10, replayed: true });
    await expect(grantCredits(testEnv, mutation('grant-1', 11))).rejects.toThrow(/idempotency key collision/i);
    expect(await getCreditBalance(testEnv, userId)).toBe(10);
  });

  it('allows only one concurrent spend when the balance covers one operation', async () => {
    await grantCredits(testEnv, mutation('grant-race', 10));
    const results = await Promise.allSettled([
      spendCredits(testEnv, mutation('spend-race-a', 7)),
      spendCredits(testEnv, mutation('spend-race-b', 7)),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') expect(rejected.reason).toBeInstanceOf(InsufficientCreditsError);
    expect(await getCreditBalance(testEnv, userId)).toBe(3);
  });

  it('derives a refund from the immutable original spend', async () => {
    await grantCredits(testEnv, mutation('grant-refund', 10));
    const spend = mutation('spend-refund', 4);
    await spendCredits(testEnv, spend);
    const result = await refundCredits(testEnv, {
      userId,
      originalSpendIdempotencyKey: spend.idempotencyKey,
      referenceType: 'support-refund',
      referenceId: `${userId}:refund-case-1`,
      idempotencyKey: `${userId}:refund-1`,
      actorId: 'support-user',
    });
    expect(result.balance).toBe(10);
    expect((await reconcileCreditBalance(testEnv, userId)).consistent).toBe(true);
  });

  it('rejects mutation of the append-only ledger', async () => {
    const grant = mutation('grant-immutable', 3);
    await grantCredits(testEnv, grant);
    await expect(
      env.DB!.prepare('UPDATE credit_ledger SET delta = 99 WHERE idempotency_key = ?')
        .bind(grant.idempotencyKey).run(),
    ).rejects.toThrow(/append-only/i);
  });
});
