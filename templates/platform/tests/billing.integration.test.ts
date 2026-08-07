import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { Env } from '../src/platform/env';
import { hmacSha256Hex } from '../src/platform/crypto';
import { getCreditBalance } from '../src/modules/credits/public';
import { handleStripeWebhook } from '../src/modules/billing/public';

const secret = 'whsec_test_secret';
const testEnv = {
  DB: env.DB,
  DATABASE_KIND: 'd1',
  APP_ENV: 'local',
  APP_ORIGIN: 'http://example.test',
  PAYMENT_PROVIDER: 'stripe',
  STRIPE_WEBHOOK_SECRET: secret,
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
} as Env;

async function signature(rawBody: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  return `t=${timestamp},v1=${await hmacSha256Hex(secret, `${timestamp}.${rawBody}`)}`;
}

describe('billing webhook lifecycle', () => {
  it('applies a paid checkout once and reverses entitlements and credits once on refund', async () => {
    const suffix = crypto.randomUUID().replaceAll('-', '');
    const userId = `user_${suffix}`;
    const planId = `plan_${suffix}`;
    const orderId = `ord_${suffix}`;
    const paymentIntent = `pi_${suffix}`;
    const timestamp = Date.now();
    await env.DB!.batch([
      env.DB!.prepare('INSERT INTO app_user(id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, `${userId}@example.test`, 'Billing Test', timestamp, timestamp),
      env.DB!.prepare('INSERT INTO credit_account(user_id, balance, updated_at) VALUES (?, 0, ?)')
        .bind(userId, timestamp),
      env.DB!.prepare(`INSERT INTO plan_catalog(
        id, name, billing_mode, amount_minor, currency, entitlement_key, credit_amount,
        stripe_price_id, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).bind(
        planId,
        'Credits Pack',
        'credits',
        1500,
        'USD',
        `entitlement_${suffix}`,
        5,
        null,
        timestamp,
        timestamp,
      ),
      env.DB!.prepare(`INSERT INTO app_order(
        id, user_id, plan_id, provider, idempotency_key, amount_minor, currency,
        status, provider_payment_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        orderId,
        userId,
        planId,
        'stripe',
        `checkout:${suffix}`,
        1500,
        'USD',
        'pending',
        `cs_${suffix}`,
        timestamp,
        timestamp,
      ),
    ]);

    const paidEvent = {
      id: `evt_paid_${suffix}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_${suffix}`,
          mode: 'payment',
          status: 'complete',
          payment_status: 'paid',
          payment_intent: paymentIntent,
          customer: `cus_${suffix}`,
          client_reference_id: orderId,
          metadata: { order_id: orderId, user_id: userId, plan_id: planId },
          amount_total: 1500,
          currency: 'usd',
        },
      },
    };
    const paidRaw = JSON.stringify(paidEvent);
    const first = await handleStripeWebhook(testEnv, paidRaw, await signature(paidRaw));
    const replay = await handleStripeWebhook(testEnv, paidRaw, await signature(paidRaw));
    expect(first.duplicate).toBe(false);
    expect(replay.duplicate).toBe(true);
    expect(await getCreditBalance(testEnv, userId)).toBe(5);
    expect((await env.DB!.prepare('SELECT status FROM app_order WHERE id = ?').bind(orderId).first<{ status: string }>())?.status).toBe('paid');
    expect((await env.DB!.prepare('SELECT status FROM entitlement WHERE user_id = ?').bind(userId).first<{ status: string }>())?.status).toBe('active');
    expect((await env.DB!.prepare('SELECT COUNT(*) AS count FROM payment_record WHERE provider_payment_id = ?').bind(paymentIntent).first<{ count: number }>())?.count).toBe(1);

    const refundEvent = {
      id: `evt_refund_${suffix}`,
      type: 'charge.refunded',
      data: {
        object: {
          id: `ch_${suffix}`,
          payment_intent: paymentIntent,
          amount: 1500,
          amount_refunded: 1500,
          metadata: { order_id: orderId },
        },
      },
    };
    const refundRaw = JSON.stringify(refundEvent);
    await handleStripeWebhook(testEnv, refundRaw, await signature(refundRaw));
    const refundReplay = await handleStripeWebhook(testEnv, refundRaw, await signature(refundRaw));
    expect(refundReplay.duplicate).toBe(true);
    expect(await getCreditBalance(testEnv, userId)).toBe(0);
    expect((await env.DB!.prepare('SELECT status FROM app_order WHERE id = ?').bind(orderId).first<{ status: string }>())?.status).toBe('refunded');
    expect((await env.DB!.prepare('SELECT status FROM entitlement WHERE user_id = ?').bind(userId).first<{ status: string }>())?.status).toBe('revoked');
  });
});
