import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import { requireUser } from '../identity/public';

export const privacyRoutes = new Hono<{ Bindings: Env }>();

privacyRoutes.get('/api/account/export', async (context) => {
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const [identities, orders, entitlements, ledger] = await Promise.all([
    context.env.DB.prepare(
      'SELECT provider, subject, email, display_name, created_at FROM oauth_identity WHERE user_id = ?',
    ).bind(user.id).all(),
    context.env.DB.prepare(
      'SELECT id, plan_id, provider, amount_minor, currency, status, created_at FROM app_order WHERE user_id = ? ORDER BY created_at',
    ).bind(user.id).all(),
    context.env.DB.prepare(
      'SELECT entitlement_key, source_type, source_id, status, expires_at, updated_at FROM entitlement WHERE user_id = ?',
    ).bind(user.id).all(),
    context.env.DB.prepare(
      'SELECT id, delta, reason, reference_type, reference_id, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at',
    ).bind(user.id).all(),
  ]);
  return context.json({
    user,
    identities: identities.results ?? [],
    orders: orders.results ?? [],
    entitlements: entitlements.results ?? [],
    creditLedger: ledger.results ?? [],
  });
});

privacyRoutes.post('/api/account/delete', async (context) => {
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{ confirmation?: string }>();
  if (body.confirmation !== 'DELETE') {
    return context.json({ error: 'confirmation must equal DELETE' }, 400);
  }
  const timestamp = Date.now();
  await context.env.DB.batch([
    context.env.DB.prepare('DELETE FROM app_session WHERE user_id = ?').bind(user.id),
    context.env.DB.prepare('DELETE FROM oauth_identity WHERE user_id = ?').bind(user.id),
    context.env.DB.prepare(
      'UPDATE app_user SET email = NULL, display_name = NULL, deleted_at = ?, updated_at = ? WHERE id = ?',
    ).bind(timestamp, timestamp, user.id),
    context.env.DB.prepare(
      'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(crypto.randomUUID(), user.id, user.id, 'privacy.account_deleted', '{}', timestamp),
  ]);
  return context.json({ ok: true, providerUnlinkRequired: true });
});
