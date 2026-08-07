import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { database } from '../../platform/database';
import { requireSameOrigin } from '../../platform/security';
import { requireUser } from '../identity/public';

export const privacyRoutes = new Hono<{ Bindings: Env }>();

function noStore(context: { header(name: string, value: string): void }) {
  context.header('cache-control', 'private, no-store');
  context.header('pragma', 'no-cache');
}

async function exportPayload(env: Env, userId: string) {
  const db = database(env);
  const [user, identities, sessions, orders, payments, subscriptions, entitlements, ledger, privacyRequests, audit] = await Promise.all([
    db.first('SELECT id, email, display_name, role, created_at, updated_at, deleted_at FROM app_user WHERE id = ?', [userId]),
    db.all('SELECT provider, subject, email, display_name, created_at, updated_at FROM oauth_identity WHERE user_id = ?', [userId]),
    db.all('SELECT expires_at, created_at, last_seen_at, revoked_at FROM app_session WHERE user_id = ?', [userId]),
    db.all('SELECT id, plan_id, provider, amount_minor, currency, status, provider_payment_id, created_at, updated_at FROM app_order WHERE user_id = ? ORDER BY created_at', [userId]),
    db.all('SELECT p.id, p.order_id, p.provider, p.provider_payment_id, p.status, p.amount_minor, p.currency, p.refunded_amount_minor, p.created_at, p.updated_at FROM payment_record p JOIN app_order o ON o.id = p.order_id WHERE o.user_id = ? ORDER BY p.created_at', [userId]),
    db.all('SELECT id, plan_id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end, created_at, updated_at FROM subscription_record WHERE user_id = ? ORDER BY created_at', [userId]),
    db.all('SELECT entitlement_key, source_type, source_id, status, expires_at, updated_at FROM entitlement WHERE user_id = ?', [userId]),
    db.all('SELECT id, delta, reason, reference_type, reference_id, actor_id, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at, id', [userId]),
    db.all('SELECT id, kind, status, requested_at, completed_at, error FROM privacy_request WHERE user_id = ? ORDER BY requested_at', [userId]),
    db.all('SELECT id, actor_id, action, payload_json, created_at FROM audit_event WHERE subject_id = ? ORDER BY created_at', [userId]),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    user,
    identities,
    sessions,
    orders,
    payments,
    subscriptions,
    entitlements,
    creditLedger: ledger,
    privacyRequests,
    audit,
  };
}

privacyRoutes.get('/api/account/export', async (context) => {
  noStore(context);
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const db = database(context.env);
  const requestId = 'privacy_' + crypto.randomUUID().replaceAll('-', '');
  const requestedAt = Date.now();
  await db.run(
    'INSERT INTO privacy_request(id, user_id, kind, status, requested_at) VALUES (?, ?, ?, ?, ?)',
    [requestId, user.id, 'export', 'processing', requestedAt],
  );
  try {
    const payload = await exportPayload(context.env, user.id);
    await db.batch([
      {
        sql: 'UPDATE privacy_request SET status = ?, completed_at = ?, payload_json = ?, error = NULL WHERE id = ?',
        params: ['completed', Date.now(), JSON.stringify({ exportedAt: payload.exportedAt }), requestId],
      },
      {
        sql: 'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        params: [crypto.randomUUID(), user.id, user.id, 'privacy.export_completed', JSON.stringify({ requestId }), Date.now()],
      },
    ]);
    context.header('content-disposition', `attachment; filename="account-export-${requestId}.json"`);
    return context.json(payload);
  } catch (error) {
    await db.run(
      'UPDATE privacy_request SET status = ?, completed_at = ?, error = ? WHERE id = ?',
      ['failed', Date.now(), error instanceof Error ? error.message : String(error), requestId],
    );
    throw error;
  }
});

privacyRoutes.get('/api/account/privacy-requests', async (context) => {
  noStore(context);
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const requests = await database(context.env).all(
    'SELECT id, kind, status, requested_at, completed_at, error FROM privacy_request WHERE user_id = ? ORDER BY requested_at DESC LIMIT 100',
    [user.id],
  );
  return context.json({ requests });
});

privacyRoutes.post('/api/account/delete', async (context) => {
  noStore(context);
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{ confirmation?: string }>();
  if (body.confirmation !== 'DELETE') {
    return context.json({ error: 'confirmation must equal DELETE' }, 400);
  }

  const db = database(context.env);
  const activeSubscription = await db.first<{ provider_subscription_id: string; status: string }>(
    `SELECT provider_subscription_id, status FROM subscription_record
     WHERE user_id = ? AND status IN (?, ?, ?, ?) LIMIT 1`,
    [user.id, 'active', 'trialing', 'past_due', 'unpaid'],
  );
  if (activeSubscription) {
    return context.json({
      error: 'cancel the active subscription before deleting the account',
      subscriptionId: activeSubscription.provider_subscription_id,
      status: activeSubscription.status,
    }, 409);
  }

  const requestId = 'privacy_' + crypto.randomUUID().replaceAll('-', '');
  const timestamp = Date.now();
  const identities = await db.all<{ provider: string; subject: string }>(
    'SELECT provider, subject FROM oauth_identity WHERE user_id = ?',
    [user.id],
  );
  await db.batch([
    {
      sql: 'INSERT INTO privacy_request(id, user_id, kind, status, requested_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
      params: [requestId, user.id, 'delete', 'completed', timestamp, timestamp],
    },
    {
      sql: 'DELETE FROM app_session WHERE user_id = ?',
      params: [user.id],
    },
    {
      sql: 'DELETE FROM oauth_identity WHERE user_id = ?',
      params: [user.id],
    },
    {
      sql: 'UPDATE entitlement SET status = ?, updated_at = ? WHERE user_id = ?',
      params: ['revoked', timestamp, user.id],
    },
    {
      sql: 'UPDATE app_user SET email = NULL, display_name = NULL, role = ?, deleted_at = ?, updated_at = ? WHERE id = ?',
      params: ['user', timestamp, timestamp, user.id],
    },
    {
      sql: 'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      params: [crypto.randomUUID(), user.id, user.id, 'privacy.account_anonymized', JSON.stringify({ requestId }), timestamp],
    },
  ]);

  for (const identity of identities) {
    const outboxId = `provider-unlink:${identity.provider}:${identity.subject}`;
    const sql = db.kind === 'd1'
      ? 'INSERT OR IGNORE INTO outbox_event(id, topic, aggregate_id, payload_json, status, attempts, available_at, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
      : 'INSERT INTO outbox_event(id, topic, aggregate_id, payload_json, status, attempts, available_at, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?) ON CONFLICT(id) DO NOTHING';
    await db.run(sql, [
      outboxId,
      'identity.provider_unlink',
      user.id,
      JSON.stringify(identity),
      'pending',
      timestamp,
      timestamp,
    ]);
  }

  return context.json({
    ok: true,
    requestId,
    anonymized: true,
    providerUnlinkQueued: identities.length,
    retainedRecords: ['orders', 'payments', 'subscriptions', 'credit ledger', 'audit events'],
  });
});
