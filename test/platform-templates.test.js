import test from 'node:test';
import assert from 'node:assert/strict';
import { platformFiles } from '../src/platform-templates.js';

const plan = {
  product: { name: 'demo', region: 'kr' },
  moduleLock: { adapters: { database: { provider: 'd1' } } },
};

test('platform templates include real operational module sources', () => {
  const files = platformFiles(plan);
  for (const expected of [
    'src/modules/identity/service.ts',
    'src/modules/billing/service.ts',
    'src/modules/credits/service.ts',
    'src/modules/admin/routes.ts',
    'src/modules/privacy/routes.ts',
    'migrations/0001_platform.sql',
    'playwright.config.ts',
    '.github/workflows/deploy.yml',
  ]) assert.ok(files[expected], expected + ' should be generated');
  assert.match(files['migrations/0001_platform.sql'], /credit_ledger is append-only/);
  assert.match(files['src/modules/identity/service.ts'], /verifyOidcIdToken/);
  assert.match(files['src/modules/billing/adapters.ts'], /idempotency-key/);
});
