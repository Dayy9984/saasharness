import { Hono, type Context } from 'hono';
import type { Env } from '../../platform/env';
import { database } from '../../platform/database';
import { constantTimeEqual } from '../../platform/crypto';
import { requireSameOrigin } from '../../platform/security';
import { refundOrder } from '../billing/public';
import {
  getCreditBalance,
  getCreditHistory,
  grantCredits,
  InsufficientCreditsError,
  reconcileCreditBalance,
  spendCredits,
} from '../credits/public';
import { requireUser, revokeAllSessions } from '../identity/public';

interface Operator {
  id: string;
  role: 'support' | 'admin';
  breakGlass: boolean;
}

export const adminRoutes = new Hono<{ Bindings: Env }>();

function noStore(context: Context) {
  context.header('cache-control', 'private, no-store');
  context.header('pragma', 'no-cache');
}

async function auditOperator(
  context: Context<{ Bindings: Env }>,
  actor: Operator,
  subjectId: string | null,
  action: string,
  payload: Record<string, unknown>,
) {
  await database(context.env).run(
    'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), actor.id, subjectId, action, JSON.stringify({ ...payload, breakGlass: actor.breakGlass }), Date.now()],
  );
}

async function requireOperator(
  context: Context<{ Bindings: Env }>,
  adminOnly = false,
): Promise<Operator | null> {
  const user = await requireUser(context);
  if (user && (user.role === 'admin' || (!adminOnly && user.role === 'support'))) {
    return { id: user.id, role: user.role, breakGlass: false };
  }
  const supplied = context.req.header('x-admin-break-glass');
  const configured = context.env.ADMIN_BREAK_GLASS_TOKEN;
  if (configured && supplied && constantTimeEqual(configured, supplied)) {
    return { id: 'break-glass', role: 'admin', breakGlass: true };
  }
  return null;
}

adminRoutes.get('/api/admin/users', async (context) => {
  noStore(context);
  const actor = await requireOperator(context);
  if (!actor) return context.json({ error: 'admin or support role required' }, 403);
  const query = (context.req.query('q') ?? '').trim();
  const limit = Math.max(1, Math.min(100, Number(context.req.query('limit') ?? 25)));
  const cursor = Number(context.req.query('cursor') ?? Number.MAX_SAFE_INTEGER);
  const db = database(context.env);
  const like = `%${query.toLowerCase()}%`;
  const users = await db.all(
    `SELECT id, email, display_name, role, created_at, updated_at, deleted_at
     FROM app_user
     WHERE created_at < ? AND (
       ? = '' OR lower(id) LIKE ? OR lower(COALESCE(email, '')) LIKE ? OR lower(COALESCE(display_name, '')) LIKE ?
     )
     ORDER BY created_at DESC LIMIT ?`,
    [cursor, query, like, like, like, limit],
  );
  await auditOperator(context, actor, null, 'admin.users_searched', { query, limit });
  return context.json({
    users,
    nextCursor: users.length === limit
      ? Number((users[users.length - 1] as { created_at: number | string }).created_at)
      : null,
  });
});

adminRoutes.get('/api/admin/users/:id', async (context) => {
  noStore(context);
  const actor = await requireOperator(context);
  if (!actor) return context.json({ error: 'admin or support role required' }, 403);
  const userId = context.req.param('id');
  const db = database(context.env);
  const user = await db.first(
    'SELECT id, email, display_name, role, created_at, updated_at, deleted_at FROM app_user WHERE id = ?',
    [userId],
  );
  if (!user) return context.json({ error: 'user not found' }, 404);

  const [identities, orders, payments, subscriptions, entitlements, history, balance, reconciliation, audit, privacy] = await Promise.all([
    db.all('SELECT provider, subject, email, display_name, created_at, updated_at FROM oauth_identity WHERE user_id = ?', [userId]),
    db.all('SELECT id, plan_id, provider, amount_minor, currency, status, provider_payment_id, created_at, updated_at FROM app_order WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [userId]),
    db.all('SELECT p.id, p.order_id, p.provider, p.provider_payment_id, p.status, p.amount_minor, p.currency, p.refunded_amount_minor, p.created_at, p.updated_at FROM payment_record p JOIN app_order o ON o.id = p.order_id WHERE o.user_id = ? ORDER BY p.created_at DESC LIMIT 100', [userId]),
    db.all('SELECT id, plan_id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end, created_at, updated_at FROM subscription_record WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [userId]),
    db.all('SELECT entitlement_key, source_type, source_id, status, expires_at, updated_at FROM entitlement WHERE user_id = ?', [userId]),
    getCreditHistory(context.env, userId, 200),
    getCreditBalance(context.env, userId).catch(() => 0),
    reconcileCreditBalance(context.env, userId).catch(() => ({ account: 0, ledger: 0, consistent: false })),
    db.all('SELECT id, actor_id, action, payload_json, created_at FROM audit_event WHERE subject_id = ? ORDER BY created_at DESC LIMIT 200', [userId]),
    db.all('SELECT id, kind, status, requested_at, completed_at, error FROM privacy_request WHERE user_id = ? ORDER BY requested_at DESC LIMIT 50', [userId]),
  ]);
  await auditOperator(context, actor, userId, 'admin.user_viewed', {});
  return context.json({
    user,
    balance,
    reconciliation,
    identities,
    orders,
    payments,
    subscriptions,
    entitlements,
    ledger: history,
    audit,
    privacy,
  });
});

adminRoutes.post('/api/admin/credits/adjust', async (context) => {
  noStore(context);
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const actor = await requireOperator(context, true);
  if (!actor) return context.json({ error: 'admin role required' }, 403);
  const body = await context.req.json<{
    userId?: string;
    delta?: number;
    reason?: string;
    idempotencyKey?: string;
  }>();
  if (!body.userId || !Number.isSafeInteger(body.delta) || body.delta === 0 || !body.reason || !body.idempotencyKey) {
    return context.json({ error: 'userId, non-zero integer delta, reason, and idempotencyKey are required' }, 400);
  }
  try {
    const common = {
      userId: body.userId,
      amount: Math.abs(body.delta!),
      reason: body.reason,
      referenceType: 'admin-adjustment',
      referenceId: body.idempotencyKey,
      idempotencyKey: `admin:${body.idempotencyKey}`,
      actorId: actor.id,
    };
    const result = body.delta! > 0
      ? await grantCredits(context.env, common)
      : await spendCredits(context.env, common);
    await auditOperator(context, actor, body.userId, 'admin.credits_adjusted', { delta: body.delta, reason: body.reason });
    return context.json(result);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return context.json({ error: 'insufficient credits for negative adjustment' }, 409);
    }
    throw error;
  }
});

adminRoutes.post('/api/admin/orders/:id/refund', async (context) => {
  noStore(context);
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const actor = await requireOperator(context, true);
  if (!actor) return context.json({ error: 'admin role required' }, 403);
  const body = await context.req.json<{ reason?: string; amount?: number }>();
  if (!body.reason) return context.json({ error: 'reason is required' }, 400);
  return context.json(await refundOrder(context.env, actor.id, context.req.param('id'), body.reason, body.amount));
});

adminRoutes.post('/api/admin/users/:id/role', async (context) => {
  noStore(context);
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const actor = await requireOperator(context, true);
  if (!actor) return context.json({ error: 'admin role required' }, 403);
  const userId = context.req.param('id');
  const body = await context.req.json<{ role?: 'user' | 'support' | 'admin' }>();
  if (!body.role || !['user', 'support', 'admin'].includes(body.role)) {
    return context.json({ error: 'role must be user, support, or admin' }, 400);
  }
  if (actor.id === userId && body.role !== 'admin') {
    return context.json({ error: 'an administrator cannot demote the current session' }, 409);
  }
  const result = await database(context.env).run(
    'UPDATE app_user SET role = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [body.role, Date.now(), userId],
  );
  if (result.changes !== 1) return context.json({ error: 'user not found' }, 404);
  await auditOperator(context, actor, userId, 'admin.role_changed', { role: body.role });
  return context.json({ ok: true, userId, role: body.role });
});

adminRoutes.post('/api/admin/users/:id/revoke-sessions', async (context) => {
  noStore(context);
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const actor = await requireOperator(context, true);
  if (!actor) return context.json({ error: 'admin role required' }, 403);
  const userId = context.req.param('id');
  await revokeAllSessions(context.env, userId);
  await auditOperator(context, actor, userId, 'admin.sessions_revoked', {});
  return context.json({ ok: true });
});

adminRoutes.get('/api/admin/operations/failures', async (context) => {
  noStore(context);
  const actor = await requireOperator(context);
  if (!actor) return context.json({ error: 'admin or support role required' }, 403);
  const db = database(context.env);
  const [webhooks, outbox] = await Promise.all([
    db.all(`SELECT provider, event_id, event_type, status, attempts, received_at, processed_at, error
            FROM webhook_inbox WHERE status = ? ORDER BY received_at DESC LIMIT 100`, ['failed']),
    db.all(`SELECT id, topic, aggregate_id, status, attempts, available_at, created_at, processed_at, error
            FROM outbox_event WHERE status IN (?, ?) ORDER BY created_at DESC LIMIT 100`, ['pending', 'failed']),
  ]);
  await auditOperator(context, actor, null, 'admin.operation_failures_viewed', {});
  return context.json({ webhooks, outbox });
});
