import type { Env } from '../../platform/env';
import { requireEnv } from '../../platform/env';
import { constantTimeEqual, hmacSha256Hex } from '../../platform/crypto';

/**
 * Stripe lifecycle coverage is ported to the Cloudflare runtime from
 * wasp-lang/open-saas/template/app/src/payment/stripe (MIT).
 * The transport stays dependency-light and uses Stripe's form API directly.
 */
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
  userEmail?: string | null;
  plan: CatalogPlan;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

async function jsonResponse(response: Response, provider: string) {
  const text = await response.text();
  let body: Record<string, unknown>;
  try {
    body = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    throw new Error(`${provider} returned a non-JSON response (${response.status})`);
  }
  if (!response.ok) throw new Error(`${provider} request failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}

async function stripeRequest(
  env: Env,
  path: string,
  options: { method?: 'GET' | 'POST' | 'DELETE'; form?: URLSearchParams; idempotencyKey?: string } = {},
) {
  const headers: Record<string, string> = {
    authorization: 'Bearer ' + requireEnv(env, 'STRIPE_SECRET_KEY'),
  };
  if (options.form) headers['content-type'] = 'application/x-www-form-urlencoded';
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  if (env.STRIPE_API_VERSION) headers['stripe-version'] = env.STRIPE_API_VERSION;
  const response = await fetch('https://api.stripe.com/v1' + path, {
    method: options.method ?? 'GET',
    headers,
    body: options.form,
  });
  return jsonResponse(response, 'Stripe');
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
  if (input.userEmail) form.set('customer_email', input.userEmail);
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

  const body = await stripeRequest(env, '/checkout/sessions', {
    method: 'POST',
    form,
    idempotencyKey: input.idempotencyKey,
  });
  if (typeof body.id !== 'string' || typeof body.url !== 'string') {
    throw new Error('Stripe Checkout response is missing id or url');
  }
  return { provider: 'stripe' as const, id: body.id, url: body.url };
}

export function retrieveStripeCheckout(env: Env, sessionId: string) {
  return stripeRequest(env, '/checkout/sessions/' + encodeURIComponent(sessionId));
}

export async function createStripePortal(
  env: Env,
  customerId: string,
  returnUrl: string,
  idempotencyKey: string,
) {
  const form = new URLSearchParams({ customer: customerId, return_url: returnUrl });
  const body = await stripeRequest(env, '/billing_portal/sessions', {
    method: 'POST',
    form,
    idempotencyKey,
  });
  if (typeof body.url !== 'string') throw new Error('Stripe portal response is missing url');
  return body.url;
}

export function cancelStripeSubscription(
  env: Env,
  subscriptionId: string,
  atPeriodEnd: boolean,
  idempotencyKey: string,
) {
  if (!atPeriodEnd) {
    return stripeRequest(env, '/subscriptions/' + encodeURIComponent(subscriptionId), {
      method: 'DELETE',
      idempotencyKey,
    });
  }
  const form = new URLSearchParams({ cancel_at_period_end: 'true' });
  return stripeRequest(env, '/subscriptions/' + encodeURIComponent(subscriptionId), {
    method: 'POST',
    form,
    idempotencyKey,
  });
}

export function refundStripePayment(
  env: Env,
  input: { paymentIntentId: string; amount?: number; reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'; idempotencyKey: string },
) {
  const form = new URLSearchParams({ payment_intent: input.paymentIntentId });
  if (input.amount !== undefined) form.set('amount', String(input.amount));
  if (input.reason) form.set('reason', input.reason);
  return stripeRequest(env, '/refunds', {
    method: 'POST',
    form,
    idempotencyKey: input.idempotencyKey,
  });
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
  const numericTimestamp = Number(timestamp);
  const age = Math.abs(Date.now() / 1000 - numericTimestamp);
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

async function tossRequest(
  env: Env,
  path: string,
  options: { method?: 'GET' | 'POST'; body?: Record<string, unknown>; idempotencyKey?: string } = {},
) {
  const headers: Record<string, string> = {
    authorization: basic(requireEnv(env, 'TOSS_SECRET_KEY')),
  };
  if (options.body) headers['content-type'] = 'application/json';
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  const response = await fetch('https://api.tosspayments.com/v1' + path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return jsonResponse(response, 'Toss Payments');
}

export function confirmTossPayment(
  env: Env,
  input: { paymentKey: string; orderId: string; amount: number; idempotencyKey: string },
) {
  return tossRequest(env, '/payments/confirm', {
    method: 'POST',
    idempotencyKey: input.idempotencyKey,
    body: { paymentKey: input.paymentKey, orderId: input.orderId, amount: input.amount },
  });
}

export function retrieveTossPayment(env: Env, paymentKey: string) {
  return tossRequest(env, '/payments/' + encodeURIComponent(paymentKey));
}

export function cancelTossPayment(
  env: Env,
  input: { paymentKey: string; cancelReason: string; cancelAmount?: number; idempotencyKey: string },
) {
  return tossRequest(env, '/payments/' + encodeURIComponent(input.paymentKey) + '/cancel', {
    method: 'POST',
    idempotencyKey: input.idempotencyKey,
    body: {
      cancelReason: input.cancelReason,
      ...(input.cancelAmount === undefined ? {} : { cancelAmount: input.cancelAmount }),
    },
  });
}
