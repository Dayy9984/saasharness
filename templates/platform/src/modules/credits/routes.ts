import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import { requireUser } from '../identity/public';
import {
  getCreditBalance,
  getCreditHistory,
  InsufficientCreditsError,
  spendCredits,
} from './service';

export const creditsRoutes = new Hono<{ Bindings: Env }>();

creditsRoutes.get('/api/credits', async (context) => {
  context.header('cache-control', 'private, no-store');
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const historyLimit = Number(context.req.query('limit') ?? 20);
  const [balance, history] = await Promise.all([
    getCreditBalance(context.env, user.id),
    getCreditHistory(context.env, user.id, Number.isFinite(historyLimit) ? historyLimit : 20),
  ]);
  return context.json({ balance, history });
});

creditsRoutes.post('/api/credits/spend', async (context) => {
  context.header('cache-control', 'private, no-store');
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{
    amount?: number;
    reason?: string;
    referenceType?: string;
    referenceId?: string;
    idempotencyKey?: string;
  }>();
  if (
    !Number.isSafeInteger(body.amount)
    || body.amount! <= 0
    || !body.reason
    || !body.referenceType
    || !body.referenceId
    || !body.idempotencyKey
  ) {
    return context.json({
      error: 'positive integer amount, reason, referenceType, referenceId, and idempotencyKey are required',
    }, 400);
  }
  try {
    return context.json(await spendCredits(context.env, {
      userId: user.id,
      amount: body.amount!,
      reason: body.reason,
      referenceType: body.referenceType,
      referenceId: body.referenceId,
      idempotencyKey: body.idempotencyKey,
      actorId: user.id,
    }));
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return context.json({ error: 'insufficient credits' }, 409);
    }
    throw error;
  }
});
