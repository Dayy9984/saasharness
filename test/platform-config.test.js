import test from 'node:test';
import assert from 'node:assert/strict';
import { platformConfigFiles } from '../src/platform-config.js';

const plan = {
  product: {
    name: 'demo',
    region: 'kr',
    monetization: 'one-time',
    paymentProvider: 'toss',
  },
  modules: ['identity', 'billing', 'order', 'entitlement'],
  cloudflare: ['workers', 'assets', 'd1'],
  moduleLock: {
    adapters: {
      database: { provider: 'd1' },
      payment: { provider: 'toss' },
    },
  },
};

test('platform config chooses market default and isolated environments', () => {
  const files = platformConfigFiles(plan);
  const config = JSON.parse(files['wrangler.jsonc']);
  assert.equal(config.vars.PAYMENT_PROVIDER, 'toss');
  assert.equal(config.vars.DATABASE_KIND, 'd1');
  assert.equal(config.env.preview.vars.APP_ENV, 'preview');
  assert.equal(config.env.staging.vars.APP_ENV, 'staging');
  assert.equal(config.env.production.vars.APP_ENV, 'production');
  assert.equal(config.d1_databases[0].binding, 'DB');
  assert.equal(config.env.preview.d1_databases[0].database_name, 'demo-preview-db');
  assert.equal(config.env.production.name, 'demo');
});

test('optional Cloudflare capabilities generate explicit bindings', () => {
  const files = platformConfigFiles({
    ...plan,
    modules: [...plan.modules, 'jobs', 'email', 'storage', 'realtime'],
    cloudflare: ['workers', 'assets', 'd1', 'queues', 'r2', 'durable-objects'],
  });
  const config = JSON.parse(files['wrangler.jsonc']);
  assert.equal(config.queues.producers[0].binding, 'JOBS_QUEUE');
  assert.equal(config.queues.consumers[0].dead_letter_queue, 'demo-jobs-dlq');
  assert.equal(config.r2_buckets[0].binding, 'UPLOADS');
  assert.equal(config.durable_objects.bindings[0].name, 'REALTIME_ROOMS');
  assert.deepEqual(config.migrations[0].new_sqlite_classes, ['RealtimeRoom']);
  assert.equal(config.env.staging.vars.EMAIL_PROVIDER, 'resend');
});
