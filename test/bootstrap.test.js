import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapPlan, REQUIRED_BOOTSTRAP_INTEGRATIONS } from '../src/bootstrap.js';

test('bootstrap plan uses the pinned Cloudflare React template and official upstream integrations', async () => {
  const plan = await bootstrapPlan('./contracts', './generated/app', { provider: 'codex' });
  assert.equal(plan.base.repository, 'cloudflare/templates');
  assert.equal(plan.base.template, 'vite-react-template');
  assert.deepEqual(REQUIRED_BOOTSTRAP_INTEGRATIONS, ['spec-kit', 'impeccable']);
  assert.equal(plan.upstreamProfile, 'lifecycle');
  assert.equal(plan.execute, false);
});
