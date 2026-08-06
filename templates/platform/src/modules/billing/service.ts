import type { Env } from '../../platform/env';
import { requireEnv } from '../../platform/env';
import { grantCredits } from '../credits/public';
import {
  createStripeCheckout,
  confirmTossPayment,
  retrieveTossPayment,
  verifyStripeWebhook,
  type CatalogPlan,
} from './adapters';

interface OrderRow {
  id: string;
  user_id: string;
  plan_id: string;
  provider: string;
  amount_minor: number;
  currency: string;
  status: string;
}

interface SubscriptionPayload {
  id?: unknown;
  status?: unknown;
  metadata?: unknown;
  current_period_end?: unknown;
  cancel_at_period_end?: unknown;
}

async function catalogPlan(env: Env, planId: string): Promise<CatalogPlan> {
  const plan = await env.DB.prepare(
    'SELECT id, name, billing_mode, amount_minor, currency, entitlement_key, credit_amount, stripe_price_id FROM plan_catalog WHERE id = ? AND active = 1',
  ).bind(planId).first<CatalogPlan>();
  if (!plan) throw new Error('plan not found or inactive');
  return plan;
}

async function createOrder(env: Env, userId: string, plan: CatalogPlan, provider: string): Promise<OrderRow> {
  const order: OrderRow = {
    id: 'ord_' + crypto.randomUUID().replace(/-/g, ''),
    user_id: userId,
    plan_id: plan.id,
    provider,
    amount_minor: plan.amount_minor,
    currency: plan.currency,
    status: 'created',
  };
  const timestamp = Date.now();
  await env.DB.prepare(
    'INSERT INTO app_order(id, user_id, plan_id, provider, amount_minor, currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(
    order.id,
    order.user_id,
    order.plan_id,
    provider,
    order.amount_minor,
    order.currency,
    order.status,
    timestamp,
    timestamp,
  ).run();
  return order;
}

export async function beginCheckout(env: Env, userId: string, planId: string) {
  const plan = await catalogPlan(env, planId);
  const provider = env.PAYMENT_PROVIDER;
  if (provider === 'toss' && plan.billing_mode === 'subscription') {
    throw new Error('Toss recurring billing-key flow is not configured; select a supported KR subscription adapter');
  }
  const order = await createOrder(env, userId, plan, provider);
  const idempotencyKey = 'checkout:' + order.id;

  if (provider === 'stripe') {
    const session = await createStripeCheckout(env, {
      orderId: order.id,
      userId,
      plan,
      successUrl: env.APP_ORIGIN + '/billing/success',
      cancelUrl: env.APP_ORIGIN + '/billing/cancel',
      idempotencyKey,
    });
    await env.DB.prepare(
      'UPDATE app_order SET status = ?, provider_payment_id = ?, updated_at = ? WHERE id = ?',
    ).bind('pending', session.id, Date.now(), order.id).run();
    return { provider, orderId: order.id, checkoutUrl: session.url };
  }

  return {
    provider,
    orderId: order.id,
    amount: order.amount_minor,
    currency: order.currency,
    orderName: plan.name,
    clientKey: requireEnv(env, 'TOSS_CLIENT_KEY'),
    successUrl: env.APP_ORIGIN + '/billing/toss/success',
    failUrl: env.APP_ORIGIN + '/billing/toss/fail',
  };
}

async function claimWebhook(
  env: Env,
  provider: string,
  eventId: string,
  eventType: string,
  payload: unknown,
): Promise<boolean> {
  const existing = await env.DB.prepare(
    'SELECT processed_at FROM webhook_inbox WHERE provider = ? AND event_id = ?',
  ).bind(provider, eventId).first<{ processed_at: number | null }>();
  if (existing?.processed_at) return false;
  if (!existing) {
    try {
      await env.DB.prepare(
        'INSERT INTO webhook_inbox(provider, event_id, event_type, payload_json, received_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(provider, eventId, eventType, JSON.stringify(payload), Date.now()).run();
    } catch {
      const raced = await env.DB.prepare(
        'SELECT processed_at FROM webhook_inbox WHERE provider = ? AND event_id = ?',
      ).bind(provider, eventId).first<{ processed_at: number | null }>();
      if (raced?.processed_at) return false;
    }
  }
  return true;
}

async function markWebhookError(env: Env, provider: string, eventId: string, error: unknown) {
  await env.DB.prepare(
    'UPDATE webhook_inbox SET error = ? WHERE provider = ? AND event_id = ?',
  ).bind(error instanceof Error ? error.message : String(error), provider, eventId).run();
}

async function applyPaidOrder(
  env: Env,
  orderId: string,
  providerPaymentId: string,
  payload: Record<string, unknown>,
) {
  const order = await env.DB.prepare(
    'SELECT id, user_id, plan_id, provider, amount_minor, currency, status FROM app_order WHERE id = ?',
  ).bind(orderId).first<OrderRow>();
  if (!order) throw new Error('order not found');

  const amount = payload.amount_total ?? payload.totalAmount;
  if (typeof amount === 'number' && amount !== order.amount_minor) {
    throw new Error('provider payment amount does not match the server order');
  }
  const currency = payload.currency;
  if (typeof currency === 'string' && currency.toUpperCase() !== order.currency.toUpperCase()) {
    throw new Error('provider payment currency does not match the server order');
  }

  const plan = await catalogPlan(env, order.plan_id);
  const timestamp = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE app_order SET status = ?, provider_payment_id = ?, updated_at = ? WHERE id = ?',
    ).bind('paid', providerPaymentId, timestamp, order.id),
    env.DB.prepare(
      'INSERT INTO payment_record(id, order_id, provider, provider_payment_id, status, amount_minor, currency, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(provider, provider_payment_id) DO UPDATE SET status = excluded.status, payload_json = excluded.payload_json, updated_at = excluded.updated_at',
    ).bind(
      crypto.randomUUID(),
      order.id,
      order.provider,
      providerPaymentId,
      'paid',
      order.amount_minor,
      order.currency,
      JSON.stringify(payload),
      timestamp,
      timestamp,
    ),
    env.DB.prepare(
      'INSERT INTO entitlement(user_id, entitlement_key, source_type, source_id, status, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, entitlement_key) DO UPDATE SET source_type = excluded.source_type, source_id = excluded.source_id, status = excluded.status, updated_at = excluded.updated_at',
    ).bind(order.user_id, plan.entitlement_key, 'order', order.id, 'active', timestamp),
    env.DB.prepare(
      'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      crypto.randomUUID(),
      order.user_id,
      order.user_id,
      'billing.paid',
      JSON.stringify({ orderId: order.id, providerPaymentId }),
      timestamp,
    ),
  ]);

  if (plan.credit_amount > 0) {
    await grantCredits(env, {
      userId: order.user_id,
      amount: plan.credit_amount,
      reason: 'purchase',
      referenceType: 'order',
      referenceId: order.id,
      idempotencyKey: 'order-credits:' + order.id,
      actorId: order.user_id,
    });
  }
}

async function applyStripeSubscription(env: Env, object: SubscriptionPayload) {
  if (typeof object.id !== 'string' || typeof object.status !== 'string') return;
  const metadata = object.metadata as Record<string, unknown> | undefined;
  const userId = metadata?.user_id;
  const planId = metadata?.plan_id;
  const orderId = metadata?.order_id;
  if (typeof userId !== 'string' || typeof planId !== 'string') return;
  const timestamp = Date.now();
  const entitlementStatus = ['active', 'trialing'].includes(object.status)
    ? 'active'
    : ['past_due', 'unpaid'].includes(object.status)
      ? 'grace'
      : 'revoked';
  const plan = await catalogPlan(env, planId);
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO subscription_record(id, user_id, plan_id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(provider, provider_subscription_id) DO UPDATE SET status = excluded.status, current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end, updated_at = excluded.updated_at',
    ).bind(
      'sub_' + crypto.randomUUID().replace(/-/g, ''),
      userId,
      planId,
      'stripe',
      object.id,
      object.status,
      typeof object.current_period_end === 'number' ? object.current_period_end * 1000 : null,
      object.cancel_at_period_end === true ? 1 : 0,
      timestamp,
      timestamp,
    ),
    env.DB.prepare(
      'INSERT INTO entitlement(user_id, entitlement_key, source_type, source_id, status, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, entitlement_key) DO UPDATE SET source_type = excluded.source_type, source_id = excluded.source_id, status = excluded.status, updated_at = excluded.updated_at',
    ).bind(userId, plan.entitlement_key, 'subscription', object.id, entitlementStatus, timestamp),
    env.DB.prepare(
      'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      crypto.randomUUID(),
      userId,
      userId,
      'billing.subscription_updated',
      JSON.stringify({ subscriptionId: object.id, orderId, status: object.status }),
      timestamp,
    ),
  ]);
}

export async function finishTossCheckout(
  env: Env,
  userId: string,
  input: { paymentKey: string; orderId: string; amount: number },
) {
  const order = await env.DB.prepare(
    'SELECT id, user_id, plan_id, provider, amount_minor, currency, status FROM app_order WHERE id = ? AND user_id = ?',
  ).bind(input.orderId, userId).first<OrderRow>();
  if (!order || order.provider !== 'toss') throw new Error('Toss order not found');
  if (order.amount_minor !== input.amount) throw new Error('payment amount does not match server order');
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
  const eventId = String(event.id);
  const eventType = String(event.type);
  if (!await claimWebhook(env, 'stripe', eventId, eventType, event)) return { duplicate: true };
  try {
    const object = (event.data as { object?: Record<string, unknown> } | undefined)?.object ?? {};
    if (eventType === 'checkout.session.completed') {
      const metadata = object.metadata as Record<string, unknown> | undefined;
      const orderId = metadata?.order_id ?? object.client_reference_id;
      const complete = object.status === 'complete';
      const paymentComplete = object.payment_status === 'paid' || object.mode === 'subscription';
      if (complete && paymentComplete && typeof orderId === 'string') {
        await applyPaidOrder(env, orderId, String(object.id), object);
      }
    }
    if (eventType.startsWith('customer.subscription.')) {
      await applyStripeSubscription(env, object);
    }
    await env.DB.prepare(
      'UPDATE webhook_inbox SET processed_at = ?, error = NULL WHERE provider = ? AND event_id = ?',
    ).bind(Date.now(), 'stripe', eventId).run();
    return { duplicate: false };
  } catch (error) {
    await markWebhookError(env, 'stripe', eventId, error);
    throw error;
  }
}

export async function handleTossWebhook(
  env: Env,
  transmissionId: string | null,
  payload: Record<string, unknown>,
) {
  const data = (payload.data as Record<string, unknown> | undefined) ?? payload;
  const paymentKey = data.paymentKey;
  if (typeof paymentKey !== 'string') throw new Error('Toss webhook paymentKey missing');
  const eventId = transmissionId ?? 'payment:' + paymentKey + ':' + String(payload.createdAt ?? data.status ?? 'unknown');
  const eventType = String(payload.eventType ?? 'PAYMENT_STATUS_CHANGED');
  if (!await claimWebhook(env, 'toss', eventId, eventType, payload)) return { duplicate: true };
  try {
    const verified = await retrieveTossPayment(env, paymentKey);
    if (verified.status === 'DONE') {
      await applyPaidOrder(env, String(verified.orderId), paymentKey, verified);
    }
    await env.DB.prepare(
      'UPDATE webhook_inbox SET processed_at = ?, error = NULL WHERE provider = ? AND event_id = ?',
    ).bind(Date.now(), 'toss', eventId).run();
    return { duplicate: false };
  } catch (error) {
    await markWebhookError(env, 'toss', eventId, error);
    throw error;
  }
}
