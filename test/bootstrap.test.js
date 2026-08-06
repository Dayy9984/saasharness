import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOTSTRAP_PROJECT_COMMANDS,
  bootstrapPlan,
  REQUIRED_BOOTSTRAP_INTEGRATIONS,
} from '../src/bootstrap.js';

test('bootstrap plan uses the pinned Cloudflare React template and official upstream integrations', async () => {
  const plan = await bootstrapPlan('./contracts', './generated/app', { provider: 'codex' });
  assert.equal(plan.base.repository, 'cloudflare/templates');
  assert.equal(plan.base.template, 'vite-react-template');
  assert.deepEqual(REQUIRED_BOOTSTRAP_INTEGRATIONS, ['spec-kit', 'impeccable']);
  assert.equal(plan.upstreamProfile, 'lifecycle');
  assert.equal(plan.execute, false);
});

test('bootstrap verification installs, audits, builds, tests, and runs a browser journey', async () => {
  const commandNames = BOOTSTRAP_PROJECT_COMMANDS.map(([bin, args]) => [bin, args.join(' ')]);
  assert.deepEqual(commandNames, [
    ['npm', 'install'],
    ['npm', 'audit --omit=dev --audit-level=high'],
    ['npm', 'run check'],
    ['npm', 'test'],
    ['npx', 'playwright install chromium'],
    ['npm', 'run test:e2e'],
  ]);
  const skipped = await bootstrapPlan('./contracts', './generated/app', { verify: false });
  assert.deepEqual(skipped.projectVerification, []);
});
