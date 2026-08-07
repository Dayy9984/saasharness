import type { Env } from '../../platform/env';
import { database, type SqlDatabase } from '../../platform/database';
import { requireEnv } from '../../platform/env';
import {
  grantCredits,
  InsufficientCreditsError,
  spendCredits,
} from '../credits/public';
import {
  cancelStripeSubscription,
  cancelTossPayment,
  confirmTossPayment,
  createStripeCheckout,
  createStripePortal,
  refundStripePayment,
  retrieveStripeCheckout,
  retrieveTossPayment,
  verifyStripeWebhook,
  type CatalogPlan,
} from './adapters';

interface OrderRow {
  id: string;
  user_id: string;
  plan_id: string;
  provider: 'stripe' | 'toss';
  idempotency_key: string;
  amount_minor: number | string;
  currency: string;
  status: string;
  provider_payment_id: string | null;
}

interface PaymentRow {
  id: string;
  order_id: string;
  provider: 'stripe' | 'toss';
  provider_payment_id: string;
  status: string;
  amount_minor: number | string;
  currency: string;
  refunded_amount_minor: number | string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  provider: 'stripe' | 'toss';
  provider_subscription_id: string;
  status: string;
  current_period_end: number | string | null;
  cancel_at_period_end: boolean | number;
}

interface WebhookRow {
  status: 'processing' | 'processed' | 'failed';
  lease_until: number | string | null;
  attempts: number | string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function orderAmount(order: OrderRow) {
  return Number(order.amount_minor);
}

async function catalogPlan(db: SqlDatabase, planId: string): Promise<CatalogPlan> {
  const plan = await db.first<CatalogPlan>(
    'SELECT id, name, billing_mode, amount_minor, currency, entitlement_key, credit_amount, stripe_price_id FROM plan_catalog WHERE id = ? AND active = ?',
    [planId, true],
  );
  if (!plan) throw new Error('plan not found or inactive');
  return {
    ...plan,
    amount_minor: Number(plan.amount_minor),
    credit_amount: Number(plan.credit_amount),
  };
}

export async function listPlans(env: Env) {
  const rows = await database(env).all<CatalogPlan>(
    'SELECT id, name, billing_mode, amount_minor, currency, entitlement_key, credit_amount, stripe_price_id FROM plan_catalog WHERE active = ? ORDER BY amount_minor, id',
    [true],
  );
  return rows.map((plan) => ({
    ...plan,
    amount_minor: Number(plan.amount_minor),
    credit_amount: Number(plan.credit_amount),
  }));
}

async function userEmail(db: SqlDatabase, userId: string) {
  const row = await db.first<{ email: string | null }>(
    'SELECT email FROM app_user WHERE id = ? AND deleted_at IS NULL',
    [userId],
  );
  return row?.email ?? null;
}

function assertSameOrder(order: OrderRow, userId: string, plan: CatalogPlan, provider: string) {
  if (
    order.user_id !== userId
    || order.plan_id !== plan.id
    || order.provider !== provider
    || orderAmount(order) !== plan.amount_minor
    || order.currency.toUpperCase() !== plan.currency.toUpperCase()
  ) {
    throw new Error('checkout idempotency key was reused for a different order');
  }
}

async function createOrReplayOrder(
  db: SqlDatabase,
  userId: string,
  plan: CatalogPlan,
  provider: 'stripe' | 'toss',
  clientIdempotencyKey: string,
): Promise<{ order: OrderRow; replayed: boolean }> {
  const idempotencyKey = `checkout:${userId}:${clientIdempotencyKey}`;
  const existing = await db.first<OrderRow>(
    'SELECT id, user_id, plan_id, provider, idempotency_key, amount_minor, currency, status, provider_payment_id FROM app_order WHERE idempotency_key = ?',
    [idempotencyKey],
  );
  if (existing) {
    assertSameOrder(existing, userId, plan, provider);
    return { order: existing, replayed: true };
  }

  const timestamp = Date.now();
  const order: OrderRow = {
    id: 'ord_' + crypto.randomUUID().replaceAll('-', ''),
    user_id: userId,
    plan_id: plan.id,
    provider,
    idempotency_key: idempotencyKey,
    amount_minor: plan.amount_minor,
    currency: plan.currency.toUpperCase(),
    status: 'created',
    provider_payment_id: null,
  };
  try {
    await db.run(
      'INSERT INTO app_order(id, user_id, plan_id, provider, idempotency_key, amount_minor, currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        order.id,
        order.user_id,
        order.plan_id,
        provider,
        order.idempotency_key,
        order.amount_minor,
        order.currency,
        order.status,
        timestamp,
        timestamp,
      ],
    );
    return { order, replayed: false };
  } catch (error) {
    const winner = await db.first<OrderRow>(
      'SELECT id, user_id, plan_id, provider, idempotency_key, amount_minor, currency, status, provider_payment_id FROM app_order WHERE idempotency_key = ?',
      [idempotencyKey],
    );
    if (!winner) throw error;
    assertSameOrder(winner, userId, plan, provider);
    return { order: winner, replayed: true };
  }
}

export async function beginCheckout(
  env: Env,
  userId: string,
  input: { planId: string; idempotencyKey: string },
) {
  if (!input.planId || !input.idempotencyKey) throw new Error('planId and idempotencyKey are required');
  const db = database(env);
  const plan = await catalogPlan(db, input.planId);
  const provider = env.PAYMENT_PROVIDER;
  if (provider === 'toss' && plan.billing_mode === 'subscription') {
    throw new Error('Toss recurring billing is not selected for this harness profile; use Stripe or install a Toss billing-key scheduler adapter');
  }
  const { order, replayed } = await createOrReplayOrder(db, userId, plan, provider, input.idempotencyKey);

  if (provider === 'stripe') {
    const session = await createStripeCheckout(env, {
      orderId: order.id,
      userId,
      userEmail: await userEmail(db, userId),
      plan,
      successUrl: env.APP_ORIGIN + '/billing/success',
      cancelUrl: env.APP_ORIGIN + '/billing/cancel',
      idempotencyKey: order.idempotency_key,
    });
    await db.run(
      'UPDATE app_order SET status = ?, provider_payment_id = ?, updated_at = ? WHERE id = ? AND status IN (?, ?)',
      ['pending', session.id, Date.now(), order.id, 'created', 'pending'],
    );
    return { provider, orderId: order.id, checkoutUrl: session.url, replayed };
  }

  return {
    provider,
    orderId: order.id,
    amount: orderAmount(order),
    currency: order.currency,
    orderName: plan.name,
    clientKey: requireEnv(env, 'TOSS_CLIENT_KEY'),
    successUrl: env.APP_ORIGIN + '/billing/toss/success',
    failUrl: env.APP_ORIGIN + '/billing/toss/fail',
    replayed,
  };
}

async function insertWebhook(
  db: SqlDatabase,
  provider: string,
  eventId: string,
  eventType: string,
  payload: unknown,
  leaseUntil: number,
) {
  const sql = db.kind === 'd1'
    ? 'INSERT OR IGNORE INTO webhook_inbox(provider, event_id, event_type, payload_json, status, attempts, lease_until, received_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
    : 'INSERT INTO webhook_inbox(provider, event_id, event_type, payload_json, status, attempts, lease_until, received_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(provider, event_id) DO NOTHING';
  return db.run(sql, [provider, eventId, eventType, JSON.stringify(payload), 'processing', leaseUntil, Date.now()]);
}

async function claimWebhook(
  db: SqlDatabase,
  provider: string,
  eventId: string,
  eventType: string,
  payload: unknown,
): Promise<boolean> {
  const timestamp = Date.now();
  const leaseUntil = timestamp + 2 * 60 * 1000;
  const inserted = await insertWebhook(db, provider, eventId, eventType, payload, leaseUntil);
  if (inserted.changes === 1) return true;

  const existing = await db.first<WebhookRow>(
    'SELECT status, lease_until, attempts FROM webhook_inbox WHERE provider = ? AND event_id = ?',
    [provider, eventId],
  );
  if (!existing || existing.status === 'processed') return false;
  if (existing.status === 'processing' && Number(existing.lease_until ?? 0) > timestamp) return false;

  const reclaimed = await db.run(
    `UPDATE webhook_inbox
     SET status = ?, attempts = attempts + 1, lease_until = ?, error = NULL, payload_json = ?, event_type = ?
     WHERE provider = ? AND event_id = ? AND status <> ? AND (lease_until IS NULL OR lease_until <= ?)`,
    ['processing', leaseUntil, JSON.stringify(payload), eventType, provider, eventId, 'processed', timestamp],
  );
  return reclaimed.changes === 1;
}

async function finishWebhook(db: SqlDatabase, provider: string, eventId: string) {
  await db.run(
    'UPDATE webhook_inbox SET status = ?, processed_at = ?, lease_until = NULL, error = NULL WHERE provider = ? AND event_id = ?',
    ['processed', Date.now(), provider, eventId],
  );
}

async function failWebhook(db: SqlDatabase, provider: string, eventId: string, error: unknown) {
  await db.run(
    'UPDATE webhook_inbox SET status = ?, lease_until = NULL, error = ? WHERE provider = ? AND event_id = ?',
    ['failed', error instanceof Error ? error.message : String(error), provider, eventId],
  );
}

async function upsertBillingCustomer(
  db: SqlDatabase,
  userId: string,
  provider: string,
  customerId: string | null,
) {
  if (!customerId) return;
  const timestamp = Date.now();
  await db.run(
    `INSERT INTO billing_customer(user_id, provider, provider_customer_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET provider_customer_id = excluded.provider_customer_id, updated_at = excluded.updated_at`,
    [userId, provider, customerId, timestamp, timestamp],
  );
}

async function applyEntitlement(
  db: SqlDatabase,
  input: { userId: string; plan: CatalogPlan; sourceType: string; sourceId: string; status: 'active' | 'grace' | 'revoked'; expiresAt?: number | null },
) {
  await db.run(
    `INSERT INTO entitlement(user_id, entitlement_key, source_type, source_id, status, expires_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, entitlement_key) DO UPDATE SET
       source_type = excluded.source_type,
       source_id = excluded.source_id,
       status = excluded.status,
       expires_at = excluded.expires_at,
       updated_at = excluded.updated_at`,
    [input.userId, input.plan.entitlement_key, input.sourceType, input.sourceId, input.status, input.expiresAt ?? null, Date.now()],
  );
}

async function applyPaidOrder(
  env: Env,
  orderId: string,
  providerPaymentId: string,
  payload: Record<string, unknown>,
) {
  const db = database(env);
  const order = await db.first<OrderRow>(
    'SELECT id, user_id, plan_id, provider, idempotency_key, amount_minor, currency, status, provider_payment_id FROM app_order WHERE id = ?',
    [orderId],
  );
  if (!order) throw new Error('order not found');

  const amount = integer(payload.amount_total) ?? integer(payload.totalAmount) ?? integer(payload.amount);
  if (amount !== null && amount !== orderAmount(order)) {
    throw new Error('provider payment amount does not match the server order');
  }
  const currency = text(payload.currency);
  if (currency && currency.toUpperCase() !== order.currency.toUpperCase()) {
    throw new Error('provider payment currency does not match the server order');
  }

  const plan = await catalogPlan(db, order.plan_id);
  const timestamp = Date.now();
  const paymentId = 'pay_' + crypto.randomUUID().replaceAll('-', '');
  await db.batch([
    {
      sql: 'UPDATE app_order SET status = ?, provider_payment_id = ?, updated_at = ? WHERE id = ?',
      params: ['paid', providerPaymentId, timestamp, order.id],
    },
    {
      sql: `INSERT INTO payment_record(id, order_id, provider, provider_payment_id, status, amount_minor, currency, refunded_amount_minor, payload_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
            ON CONFLICT(provider, provider_payment_id) DO UPDATE SET status = excluded.status, payload_json = excluded.payload_json, updated_at = excluded.updated_at`,
      params: [paymentId, order.id, order.provider, providerPaymentId, 'paid', orderAmount(order), order.currency, JSON.stringify(payload), timestamp, timestamp],
    },
    {
      sql: 'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      params: [crypto.randomUUID(), order.user_id, order.user_id, 'billing.paid', JSON.stringify({ orderId: order.id, providerPaymentId }), timestamp],
    },
  ]);

  if (plan.billing_mode !== 'subscription') {
    await applyEntitlement(db, {
      userId: order.user_id,
      plan,
      sourceType: 'order',
      sourceId: order.id,
      status: 'active',
    });
    if (plan.credit_amount > 0) {
      await grantCredits(env, {
        userId: order.user_id,
        amount: plan.credit_amount,
        reason: 'purchase',
        referenceType: 'order',
        referenceId: order.id,
        idempotencyKey: `payment-credit:${order.provider}:${providerPaymentId}`,
        actorId: order.user_id,
      });
    }
  }
  return { order, plan };
}

function subscriptionStatus(value: string) {
  if (['active', 'trialing'].includes(value)) return 'active' as const;
  if (['past_due', 'unpaid', 'paused', 'incomplete'].includes(value)) return 'grace' as const;
  return 'revoked' as const;
}

async function upsertStripeSubscription(
  env: Env,
  object: Record<string, unknown>,
  fallbackMetadata: Record<string, unknown> = {},
) {
  const db = database(env);
  const subscriptionId = text(object.id) ?? text(object.subscription);
  const status = text(object.status);
  const metadata = { ...fallbackMetadata, ...asRecord(object.metadata) };
  let userId = text(metadata.user_id);
  let planId = text(metadata.plan_id);
  const customerId = text(object.customer);

  if ((!userId || !planId) && subscriptionId) {
    const existing = await db.first<SubscriptionRow>(
      'SELECT id, user_id, plan_id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end FROM subscription_record WHERE provider = ? AND provider_subscription_id = ?',
      ['stripe', subscriptionId],
    );
    userId = userId ?? existing?.user_id ?? null;
    planId = planId ?? existing?.plan_id ?? null;
  }
  if (!subscriptionId || !status || !userId || !planId) return null;

  const plan = await catalogPlan(db, planId);
  const timestamp = Date.now();
  const periodEnd = integer(object.current_period_end);
  await db.run(
    `INSERT INTO subscription_record(id, user_id, plan_id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, provider_subscription_id) DO UPDATE SET
       user_id = excluded.user_id,
       plan_id = excluded.plan_id,
       status = excluded.status,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       updated_at = excluded.updated_at`,
    [
      'sub_' + crypto.randomUUID().replaceAll('-', ''),
      userId,
      planId,
      'stripe',
      subscriptionId,
      status,
      periodEnd === null ? null : periodEnd * 1000,
      bool(object.cancel_at_period_end),
      timestamp,
      timestamp,
    ],
  );
  await upsertBillingCustomer(db, userId, 'stripe', customerId);
  await applyEntitlement(db, {
    userId,
    plan,
    sourceType: 'subscription',
    sourceId: subscriptionId,
    status: subscriptionStatus(status),
    expiresAt: periodEnd === null ? null : periodEnd * 1000,
  });
  await db.run(
    'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), userId, userId, 'billing.subscription_updated', JSON.stringify({ subscriptionId, status }), timestamp],
  );
  return { userId, plan, subscriptionId, status };
}

function invoiceSubscriptionDetails(invoice: Record<string, unknown>) {
  const parent = asRecord(invoice.parent);
  const details = asRecord(parent.subscription_details);
  return {
    subscriptionId: text(details.subscription) ?? text(invoice.subscription),
    metadata: asRecord(details.metadata),
  };
}

async function applyStripeInvoicePaid(env: Env, invoice: Record<string, unknown>) {
  const details = invoiceSubscriptionDetails(invoice);
  if (!details.subscriptionId) return;
  const db = database(env);
  const existing = await db.first<SubscriptionRow>(
    'SELECT id, user_id, plan_id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end FROM subscription_record WHERE provider = ? AND provider_subscription_id = ?',
    ['stripe', details.subscriptionId],
  );
  const userId = text(details.metadata.user_id) ?? existing?.user_id ?? null;
  const planId = text(details.metadata.plan_id) ?? existing?.plan_id ?? null;
  if (!userId || !planId) return;
  const plan = await catalogPlan(db, planId);
  await applyEntitlement(db, {
    userId,
    plan,
    sourceType: 'subscription',
    sourceId: details.subscriptionId,
    status: 'active',
  });
  if (plan.credit_amount > 0 && text(invoice.id)) {
    await grantCredits(env, {
      userId,
      amount: plan.credit_amount,
      reason: 'subscription_grant',
      referenceType: 'stripe-invoice',
      referenceId: text(invoice.id)!,
      idempotencyKey: 'stripe-invoice-credit:' + text(invoice.id),
      actorId: userId,
    });
  }
}

async function applyStripeInvoiceFailed(env: Env, invoice: Record<string, unknown>) {
  const details = invoiceSubscriptionDetails(invoice);
  if (!details.subscriptionId) return;
  const db = database(env);
  const subscription = await db.first<SubscriptionRow>(
    'SELECT id, user_id, plan_id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end FROM subscription_record WHERE provider = ? AND provider_subscription_id = ?',
    ['stripe', details.subscriptionId],
  );
  if (!subscription) return;
  const plan = await catalogPlan(db, subscription.plan_id);
  await db.run(
    'UPDATE subscription_record SET status = ?, updated_at = ? WHERE provider = ? AND provider_subscription_id = ?',
    ['past_due', Date.now(), 'stripe', details.subscriptionId],
  );
  await applyEntitlement(db, {
    userId: subscription.user_id,
    plan,
    sourceType: 'subscription',
    sourceId: details.subscriptionId,
    status: 'grace',
  });
}

async function enqueueCreditRecovery(
  db: SqlDatabase,
  order: OrderRow,
  plan: CatalogPlan,
  providerPaymentId: string,
  error: unknown,
) {
  const timestamp = Date.now();
  const id = `credit-recovery:${order.provider}:${providerPaymentId}`;
  const sql = db.kind === 'd1'
    ? 'INSERT OR IGNORE INTO outbox_event(id, topic, aggregate_id, payload_json, status, attempts, available_at, created_at, error) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)'
    : 'INSERT INTO outbox_event(id, topic, aggregate_id, payload_json, status, attempts, available_at, created_at, error) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?) ON CONFLICT(id) DO NOTHING';
  await db.run(sql, [
    id,
    'billing.credit_recovery_required',
    order.id,
    JSON.stringify({ orderId: order.id, userId: order.user_id, creditAmount: plan.credit_amount, providerPaymentId }),
    'pending',
    timestamp,
    timestamp,
    error instanceof Error ? error.message : String(error),
  ]);
}

async function applyRefundedPayment(
  env: Env,
  provider: 'stripe' | 'toss',
  providerPaymentId: string,
  refundedAmount: number | null,
  payload: Record<string, unknown>,
) {
  const db = database(env);
  let payment = await db.first<PaymentRow>(
    'SELECT id, order_id, provider, provider_payment_id, status, amount_minor, currency, refunded_amount_minor FROM payment_record WHERE provider = ? AND provider_payment_id = ?',
    [provider, providerPaymentId],
  );
  if (!payment && provider === 'stripe') {
    const orderId = text(asRecord(payload.metadata).order_id);
    if (orderId) {
      payment = await db.first<PaymentRow>(
        'SELECT id, order_id, provider, provider_payment_id, status, amount_minor, currency, refunded_amount_minor FROM payment_record WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
        [orderId],
      );
    }
  }
  if (!payment) return;
  const order = await db.first<OrderRow>(
    'SELECT id, user_id, plan_id, provider, idempotency_key, amount_minor, currency, status, provider_payment_id FROM app_order WHERE id = ?',
    [payment.order_id],
  );
  if (!order) return;
  const plan = await catalogPlan(db, order.plan_id);
  const total = Number(payment.amount_minor);
  const nextRefunded = Math.max(Number(payment.refunded_amount_minor), refundedAmount ?? total);
  const full = nextRefunded >= total;
  const timestamp = Date.now();
  await db.batch([
    {
      sql: 'UPDATE payment_record SET status = ?, refunded_amount_minor = ?, payload_json = ?, updated_at = ? WHERE id = ?',
      params: [full ? 'refunded' : 'partially_refunded', nextRefunded, JSON.stringify(payload), timestamp, payment.id],
    },
    {
      sql: 'UPDATE app_order SET status = ?, updated_at = ? WHERE id = ?',
      params: [full ? 'refunded' : 'paid', timestamp, order.id],
    },
    {
      sql: 'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      params: [crypto.randomUUID(), order.user_id, order.user_id, 'billing.refunded', JSON.stringify({ orderId: order.id, nextRefunded, full }), timestamp],
    },
  ]);
  if (full) {
    await applyEntitlement(db, {
      userId: order.user_id,
      plan,
      sourceType: 'order',
      sourceId: order.id,
      status: 'revoked',
    });
    if (plan.credit_amount > 0) {
      try {
        await spendCredits(env, {
          userId: order.user_id,
          amount: plan.credit_amount,
          reason: 'payment_refund_reversal',
          referenceType: 'order-refund',
          referenceId: order.id,
          idempotencyKey: `refund-credit-reversal:${provider}:${providerPaymentId}`,
          actorId: order.user_id,
        });
      } catch (error) {
        if (!(error instanceof InsufficientCreditsError)) throw error;
        await enqueueCreditRecovery(db, order, plan, providerPaymentId, error);
      }
    }
  }
}

async function applyDispute(env: Env, object: Record<string, unknown>) {
  const paymentIntent = text(object.payment_intent) ?? text(object.id);
  if (!paymentIntent) return;
  const db = database(env);
  const payment = await db.first<PaymentRow>(
    'SELECT id, order_id, provider, provider_payment_id, status, amount_minor, currency, refunded_amount_minor FROM payment_record WHERE provider = ? AND provider_payment_id = ?',
    ['stripe', paymentIntent],
  );
  if (!payment) return;
  const order = await db.first<OrderRow>(
    'SELECT id, user_id, plan_id, provider, idempotency_key, amount_minor, currency, status, provider_payment_id FROM app_order WHERE id = ?',
    [payment.order_id],
  );
  if (!order) return;
  const plan = await catalogPlan(db, order.plan_id);
  await db.run('UPDATE app_order SET status = ?, updated_at = ? WHERE id = ?', ['disputed', Date.now(), order.id]);
  await applyEntitlement(db, {
    userId: order.user_id,
    plan,
    sourceType: 'order',
    sourceId: order.id,
    status: 'grace',
  });
}

export async function finishTossCheckout(
  env: Env,
  userId: string,
  input: { paymentKey: string; orderId: string; amount: number },
) {
  const db = database(env);
  const order = await db.first<OrderRow>(
    'SELECT id, user_id, plan_id, provider, idempotency_key, amount_minor, currency, status, provider_payment_id FROM app_order WHERE id = ? AND user_id = ?',
    [input.orderId, userId],
  );
  if (!order || order.provider !== 'toss') throw new Error('Toss order not found');
  if (orderAmount(order) !== input.amount) throw new Error('payment amount does not match server order');
  const payment = await confirmTossPayment(env, {
    ...input,
    idempotencyKey: 'toss-confirm:' + order.id,
  });
  if (payment.status !== 'DONE') throw new Error('Toss payment is not DONE');
  await applyPaidOrder(env, order.id, String(payment.paymentKey), payment);
  return { orderId: order.id, status: 'paid' };
}

export async function handleStripeWebhook(env: Env, rawBody: string, signature: string | null) {
  const event = await verifyStripeWebhook(env, rawBody, signature);
  const eventId = text(event.id);
  const eventType = text(event.type);
  if (!eventId || !eventType) throw new Error('Stripe event id/type missing');
  const db = database(env);
  if (!await claimWebhook(db, 'stripe', eventId, eventType, event)) return { duplicate: true };
  try {
    const object = asRecord(asRecord(event.data).object);
    switch (eventType) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const metadata = asRecord(object.metadata);
        const orderId = text(metadata.order_id) ?? text(object.client_reference_id);
        const mode = text(object.mode);
        const paid = object.payment_status === 'paid' || mode === 'subscription';
        if (orderId && paid) {
          const providerPaymentId = text(object.payment_intent) ?? text(object.id)!;
          const applied = await applyPaidOrder(env, orderId, providerPaymentId, object);
          await upsertBillingCustomer(db, applied.order.user_id, 'stripe', text(object.customer));
        }
        break;
      }
      case 'invoice.paid':
        await applyStripeInvoicePaid(env, object);
        break;
      case 'invoice.payment_failed':
        await applyStripeInvoiceFailed(env, object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await upsertStripeSubscription(env, object);
        break;
      case 'charge.refunded':
        await applyRefundedPayment(env, 'stripe', text(object.payment_intent) ?? text(object.id)!, integer(object.amount_refunded), object);
        break;
      case 'refund.updated':
        if (object.status === 'succeeded') {
          await applyRefundedPayment(env, 'stripe', text(object.payment_intent) ?? text(object.charge)!, integer(object.amount), object);
        }
        break;
      case 'charge.dispute.created':
        await applyDispute(env, object);
        break;
      default:
        // Intentionally acknowledge unselected Stripe events to avoid an
        // infinite provider retry loop. The raw event remains in webhook_inbox.
        break;
    }
    await finishWebhook(db, 'stripe', eventId);
    return { duplicate: false, handled: true };
  } catch (error) {
    await failWebhook(db, 'stripe', eventId, error);
    throw error;
  }
}

export async function handleTossWebhook(
  env: Env,
  transmissionId: string | null,
  payload: Record<string, unknown>,
) {
  const data = asRecord(payload.data);
  const paymentKey = text(data.paymentKey) ?? text(payload.paymentKey);
  if (!paymentKey) throw new Error('Toss webhook paymentKey missing');
  const eventId = transmissionId ?? 'payment:' + paymentKey + ':' + String(payload.createdAt ?? data.status ?? 'unknown');
  const eventType = text(payload.eventType) ?? 'PAYMENT_STATUS_CHANGED';
  const db = database(env);
  if (!await claimWebhook(db, 'toss', eventId, eventType, payload)) return { duplicate: true };
  try {
    const verified = await retrieveTossPayment(env, paymentKey);
    const status = text(verified.status);
    if (status === 'DONE') {
      await applyPaidOrder(env, String(verified.orderId), paymentKey, verified);
    } else if (status === 'CANCELED' || status === 'PARTIAL_CANCELED') {
      const cancels = Array.isArray(verified.cancels) ? verified.cancels : [];
      const refunded = cancels.reduce((sum, cancel) => sum + Number(asRecord(cancel).cancelAmount ?? 0), 0);
      await applyRefundedPayment(env, 'toss', paymentKey, refunded, verified);
    } else if (status === 'ABORTED' || status === 'EXPIRED') {
      await db.run(
        'UPDATE app_order SET status = ?, updated_at = ? WHERE id = ?',
        ['failed', Date.now(), String(verified.orderId)],
      );
    }
    await finishWebhook(db, 'toss', eventId);
    return { duplicate: false, handled: true };
  } catch (error) {
    await failWebhook(db, 'toss', eventId, error);
    throw error;
  }
}

export async function billingSummary(env: Env, userId: string) {
  const db = database(env);
  const [orders, subscriptions, entitlements] = await Promise.all([
    db.all('SELECT id, plan_id, provider, amount_minor, currency, status, provider_payment_id, created_at, updated_at FROM app_order WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [userId]),
    db.all('SELECT id, plan_id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end, created_at, updated_at FROM subscription_record WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    db.all('SELECT entitlement_key, source_type, source_id, status, expires_at, updated_at FROM entitlement WHERE user_id = ?', [userId]),
  ]);
  return { orders, subscriptions, entitlements };
}

export async function createCustomerPortal(env: Env, userId: string) {
  if (env.PAYMENT_PROVIDER !== 'stripe') throw new Error('customer portal is available for Stripe profiles');
  const customer = await database(env).first<{ provider_customer_id: string }>(
    'SELECT provider_customer_id FROM billing_customer WHERE user_id = ? AND provider = ?',
    [userId, 'stripe'],
  );
  if (!customer) throw new Error('Stripe customer is not available yet');
  return {
    url: await createStripePortal(
      env,
      customer.provider_customer_id,
      env.APP_ORIGIN + '/account/billing',
      `portal:${userId}:${Math.floor(Date.now() / 60_000)}`,
    ),
  };
}

export async function cancelSubscription(
  env: Env,
  userId: string,
  subscriptionId: string,
  atPeriodEnd = true,
) {
  const db = database(env);
  const subscription = await db.first<SubscriptionRow>(
    'SELECT id, user_id, plan_id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end FROM subscription_record WHERE user_id = ? AND provider_subscription_id = ?',
    [userId, subscriptionId],
  );
  if (!subscription) throw new Error('subscription not found');
  if (subscription.provider !== 'stripe') throw new Error('selected subscription adapter does not expose cancellation');
  const response = await cancelStripeSubscription(
    env,
    subscription.provider_subscription_id,
    atPeriodEnd,
    `cancel:${subscription.provider_subscription_id}:${atPeriodEnd}`,
  );
  await upsertStripeSubscription(env, response, { user_id: userId, plan_id: subscription.plan_id });
  return { subscriptionId, atPeriodEnd, status: response.status };
}

export async function refundOrder(
  env: Env,
  actorId: string,
  orderId: string,
  reason: string,
  amount?: number,
) {
  const db = database(env);
  const order = await db.first<OrderRow>(
    'SELECT id, user_id, plan_id, provider, idempotency_key, amount_minor, currency, status, provider_payment_id FROM app_order WHERE id = ?',
    [orderId],
  );
  if (!order) throw new Error('order not found');
  const payment = await db.first<PaymentRow>(
    'SELECT id, order_id, provider, provider_payment_id, status, amount_minor, currency, refunded_amount_minor FROM payment_record WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
    [orderId],
  );
  if (!payment) throw new Error('paid payment record not found');
  const refundAmount = amount ?? Number(payment.amount_minor);
  if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0 || refundAmount > Number(payment.amount_minor)) {
    throw new Error('refund amount is invalid');
  }

  let providerResponse: Record<string, unknown>;
  if (order.provider === 'stripe') {
    let paymentIntentId = payment.provider_payment_id;
    if (paymentIntentId.startsWith('cs_') && order.provider_payment_id) {
      const session = await retrieveStripeCheckout(env, order.provider_payment_id);
      paymentIntentId = text(session.payment_intent) ?? paymentIntentId;
    }
    providerResponse = await refundStripePayment(env, {
      paymentIntentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      idempotencyKey: `refund:${order.id}:${refundAmount}`,
    });
    await applyRefundedPayment(env, 'stripe', paymentIntentId, refundAmount, providerResponse);
  } else {
    providerResponse = await cancelTossPayment(env, {
      paymentKey: payment.provider_payment_id,
      cancelReason: reason,
      cancelAmount: refundAmount,
      idempotencyKey: `refund:${order.id}:${refundAmount}`,
    });
    await applyRefundedPayment(env, 'toss', payment.provider_payment_id, refundAmount, providerResponse);
  }
  await db.run(
    'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), actorId, order.user_id, 'billing.refund_requested', JSON.stringify({ orderId, reason, refundAmount }), Date.now()],
  );
  return { orderId, refundAmount, provider: order.provider, providerResponse };
}
