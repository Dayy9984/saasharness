import type { Env } from '../../platform/env';
import { requireEnv } from '../../platform/env';
import { constantTimeEqual, hmacSha256Hex } from '../../platform/crypto';

export interface CatalogPlan {
  id: string;
  name: string;
  billing_mode: 'one-time' | 'subscription' | 'credits';
  amount_minor: number;
  currency: string;
  entitlement_key: string;
  credit_amount: number;
  stripe_price_id: string | null;
}

export interface CheckoutInput {
  orderId: string;
  userId: string;
  plan: CatalogPlan;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export async function createStripeCheckout(env: Env, input: CheckoutInput) {
  const form = new URLSearchParams();
  const subscription = input.plan.billing_mode === 'subscription';
  form.set('mode', subscription ? 'subscription' : 'payment');
  form.set('success_url', input.successUrl + '?session_id={CHECKOUT_SESSION_ID}');
  form.set('cancel_url', input.cancelUrl);
  form.set('client_reference_id', input.orderId);
  form.set('metadata[order_id]', input.orderId);
  form.set('metadata[user_id]', input.userId);
  form.set('metadata[plan_id]', input.plan.id);
  if (subscription) {
    form.set('subscription_data[metadata][order_id]', input.orderId);
    form.set('subscription_data[metadata][user_id]', input.userId);
    form.set('subscription_data[metadata][plan_id]', input.plan.id);
  }
  if (input.plan.stripe_price_id) {
    form.set('line_items[0][price]', input.plan.stripe_price_id);
  } else {
    form.set('line_items[0][price_data][currency]', input.plan.currency.toLowerCase());
    form.set('line_items[0][price_data][unit_amount]', String(input.plan.amount_minor));
    form.set('line_items[0][price_data][product_data][name]', input.plan.name);
    if (subscription) form.set('line_items[0][price_data][recurring][interval]', 'month');
  }
  form.set('line_items[0][quantity]', '1');

  const headers: Record<string, string> = {
    authorization: 'Bearer ' + requireEnv(env, 'STRIPE_SECRET_KEY'),
    'content-type': 'application/x-www-form-urlencoded',
    'idempotency-key': input.idempotencyKey,
  };
  if (env.STRIPE_API_VERSION) headers['stripe-version'] = env.STRIPE_API_VERSION;

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers,
    body: form,
  });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error('Stripe Checkout failed: ' + JSON.stringify(body));
  if (typeof body.id !== 'string' || typeof body.url !== 'string') {
    throw new Error('Stripe Checkout response is missing id or url');
  }
  return { provider: 'stripe' as const, id: body.id, url: body.url };
}

export async function verifyStripeWebhook(env: Env, rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) throw new Error('Stripe-Signature header missing');
  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of signatureHeader.split(',')) {
    const [key, value] = part.trim().split('=', 2);
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) throw new Error('Malformed Stripe signature');
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) throw new Error('Stripe signature timestamp outside tolerance');
  const expected = await hmacSha256Hex(
    requireEnv(env, 'STRIPE_WEBHOOK_SECRET'),
    timestamp + '.' + rawBody,
  );
  if (!signatures.some((signature) => constantTimeEqual(expected, signature))) {
    throw new Error('Invalid Stripe signature');
  }
  return JSON.parse(rawBody) as Record<string, unknown>;
}

function basic(secret: string) {
  return 'Basic ' + btoa(secret + ':');
}

export async function confirmTossPayment(
  env: Env,
  input: { paymentKey: string; orderId: string; amount: number; idempotencyKey: string },
) {
  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      authorization: basic(requireEnv(env, 'TOSS_SECRET_KEY')),
      'content-type': 'application/json',
      'idempotency-key': input.idempotencyKey,
    },
    body: JSON.stringify({ paymentKey: input.paymentKey, orderId: input.orderId, amount: input.amount }),
  });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error('Toss payment confirmation failed: ' + JSON.stringify(body));
  return body;
}

export async function retrieveTossPayment(env: Env, paymentKey: string) {
  const response = await fetch(
    'https://api.tosspayments.com/v1/payments/' + encodeURIComponent(paymentKey),
    { headers: { authorization: basic(requireEnv(env, 'TOSS_SECRET_KEY')) } },
  );
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error('Toss payment query failed: ' + JSON.stringify(body));
  return body;
}
