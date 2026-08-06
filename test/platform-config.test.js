import test from 'node:test';
import assert from 'node:assert/strict';
import { platformConfigFiles } from '../src/platform-config.js';

const plan = {
  product: { name: 'demo', region: 'kr' },
  moduleLock: { adapters: { database: { provider: 'd1' } } },
};

test('platform config chooses market default and isolated environments', () => {
  const files = platformConfigFiles(plan);
  const config = JSON.parse(files['wrangler.jsonc']);
  assert.equal(config.vars.PAYMENT_PROVIDER, 'toss');
  assert.equal(config.env.preview.vars.APP_ENV, 'preview');
  assert.equal(config.env.staging.vars.APP_ENV, 'staging');
  assert.equal(config.env.production.vars.APP_ENV, 'production');
  assert.equal(config.d1_databases[0].binding, 'DB');
});
