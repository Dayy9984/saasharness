import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import { requireUser } from '../identity/public';
import {
  beginCheckout,
  finishTossCheckout,
  handleStripeWebhook,
  handleTossWebhook,
} from './service';

export const billingRoutes = new Hono<{ Bindings: Env }>();

billingRoutes.post('/api/billing/checkout', async (context) => {
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{ planId?: string }>();
  if (!body.planId) return context.json({ error: 'planId is required' }, 400);
  return context.json(await beginCheckout(context.env, user.id, body.planId));
});

billingRoutes.post('/api/billing/toss/confirm', async (context) => {
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
