import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import { requireUser } from '../identity/public';
import {
  beginCheckout,
  billingSummary,
  cancelSubscription,
  createCustomerPortal,
  finishTossCheckout,
  handleStripeWebhook,
  handleTossWebhook,
  listPlans,
} from './service';

export const billingRoutes = new Hono<{ Bindings: Env }>();

billingRoutes.get('/api/billing/plans', async (context) => {
  context.header('cache-control', 'public, max-age=60, stale-while-revalidate=300');
  return context.json({ plans: await listPlans(context.env) });
});

billingRoutes.get('/api/billing/summary', async (context) => {
  context.header('cache-control', 'private, no-store');
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  return context.json(await billingSummary(context.env, user.id));
});

billingRoutes.post('/api/billing/checkout', async (context) => {
  context.header('cache-control', 'private, no-store');
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{ planId?: string; idempotencyKey?: string }>();
  const idempotencyKey = context.req.header('idempotency-key') ?? body.idempotencyKey;
  if (!body.planId || !idempotencyKey) {
    return context.json({ error: 'planId and Idempotency-Key are required' }, 400);
  }
  return context.json(await beginCheckout(context.env, user.id, {
    planId: body.planId,
    idempotencyKey,
  }));
});

billingRoutes.post('/api/billing/toss/confirm', async (context) => {
  context.header('cache-control', 'private, no-store');
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{ paymentKey?: string; orderId?: string; amount?: number }>();
  if (!body.paymentKey || !body.orderId || !Number.isSafeInteger(body.amount)) {
    return context.json({ error: 'paymentKey, orderId, and integer amount are required' }, 400);
  }
  return context.json(await finishTossCheckout(context.env, user.id, {
    paymentKey: body.paymentKey,
    orderId: body.orderId,
    amount: body.amount!,
  }));
});

billingRoutes.post('/api/billing/portal', async (context) => {
  context.header('cache-control', 'private, no-store');
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  return context.json(await createCustomerPortal(context.env, user.id));
});

billingRoutes.post('/api/billing/subscriptions/:id/cancel', async (context) => {
  context.header('cache-control', 'private, no-store');
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{ atPeriodEnd?: boolean }>().catch(() => ({}));
  return context.json(await cancelSubscription(
    context.env,
    user.id,
    context.req.param('id'),
    body.atPeriodEnd !== false,
  ));
});

billingRoutes.post('/api/billing/webhooks/stripe', async (context) => {
  const rawBody = await context.req.text();
  return context.json(await handleStripeWebhook(
    context.env,
    rawBody,
    context.req.header('stripe-signature') ?? null,
  ));
});

billingRoutes.post('/api/billing/webhooks/toss', async (context) => {
  const payload = await context.req.json<Record<string, unknown>>();
  return context.json(await handleTossWebhook(
    context.env,
    context.req.header('tosspayments-webhook-transmission-id') ?? null,
    payload,
  ));
});
