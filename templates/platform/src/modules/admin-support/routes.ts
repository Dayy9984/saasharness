import { Hono, type Context } from 'hono';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import { requireUser } from '../identity/public';
import { grantCredits } from '../credits/public';

export const adminRoutes = new Hono<{ Bindings: Env }>();

async function requireAdmin(context: Context<{ Bindings: Env }>) {
  const user = await requireUser(context);
  if (!user || (user.role !== 'admin' && user.role !== 'support')) return null;
  return user;
}

adminRoutes.get('/api/admin/users/:id', async (context) => {
  const actor = await requireAdmin(context);
  if (!actor) return context.json({ error: 'admin or support role required' }, 403);
  const userId = context.req.param('id');
  const user = await context.env.DB.prepare(
    'SELECT id, email, display_name, role, created_at, updated_at, deleted_at FROM app_user WHERE id = ?',
  ).bind(userId).first();
  if (!user) return context.json({ error: 'user not found' }, 404);

  const [identities, orders, entitlements, ledger, audit] = await Promise.all([
    context.env.DB.prepare(
      'SELECT provider, subject, email, display_name, created_at FROM oauth_identity WHERE user_id = ?',
    ).bind(userId).all(),
    context.env.DB.prepare(
      'SELECT id, plan_id, provider, amount_minor, currency, status, created_at FROM app_order WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    ).bind(userId).all(),
    context.env.DB.prepare(
      'SELECT entitlement_key, source_type, source_id, status, expires_at, updated_at FROM entitlement WHERE user_id = ?',
    ).bind(userId).all(),
    context.env.DB.prepare(
      'SELECT id, delta, reason, reference_type, reference_id, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    ).bind(userId).all(),
    context.env.DB.prepare(
      'SELECT actor_id, action, payload_json, created_at FROM audit_event WHERE subject_id = ? ORDER BY created_at DESC LIMIT 100',
    ).bind(userId).all(),
  ]);
  const balance = await context.env.DB.prepare(
    'SELECT balance FROM credit_account WHERE user_id = ?',
  ).bind(userId).first();

  return context.json({
    user,
    balance,
    identities: identities.results ?? [],
    orders: orders.results ?? [],
    entitlements: entitlements.results ?? [],
    ledger: ledger.results ?? [],
    audit: audit.results ?? [],
  });
});

adminRoutes.post('/api/admin/credits/adjust', async (context) => {
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const actor = await requireAdmin(context);
  if (!actor || actor.role !== 'admin') return context.json({ error: 'admin role required' }, 403);
  const body = await context.req.json<{
    userId?: string;
    amount?: number;
    reason?: string;
    idempotencyKey?: string;
  }>();
  if (!body.userId || !Number.isSafeInteger(body.amount) || body.amount! <= 0 || !body.reason || !body.idempotencyKey) {
    return context.json({ error: 'userId, positive integer amount, reason, and idempotencyKey are required' }, 400);
  }
  return context.json(await grantCredits(context.env, {
    userId: body.userId,
    amount: body.amount!,
    reason: body.reason,
    referenceType: 'admin-adjustment',
    referenceId: body.idempotencyKey,
    idempotencyKey: body.idempotencyKey,
    actorId: actor.id,
  }));
});
