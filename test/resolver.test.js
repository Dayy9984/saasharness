import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan } from '../src/assembler.js';
import { tempDir, writeContracts } from '../test-support/helpers.js';

test('KR subscription plus credits selects Kakao, Stripe, onboarding, and implemented money modules', async () => {
  const dir = await tempDir();
  await writeContracts(dir);
  const { plan } = await buildPlan(dir);
  assert.deepEqual(plan.moduleLock.adapters.identity.map((item) => item.provider), ['kakao']);
  assert.equal(plan.moduleLock.adapters.payment.provider, 'stripe');
  assert.ok(plan.modules.includes('onboarding'));
  assert.ok(plan.modules.includes('billing'));
  assert.ok(plan.modules.includes('subscription'));
  assert.ok(plan.modules.includes('credits'));
  assert.ok(plan.modules.includes('jobs'));
  assert.ok(plan.modules.includes('email'));
  assert.equal(plan.codeReady, true);
  assert.equal(plan.productionReady, false);
  assert.ok(plan.releaseEvidence.includes('onboarding-resume-first-value'));
});

test('global free product defaults to Google without billing', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { product: `version: 3\nname: global-free\nregion: global\ntargets: [web]\nmonetization: free\ncapabilities:\n  onboarding: true\n  background_jobs: false\n  file_uploads: false\n  email: false\n  realtime: false\nplatform:\n  database: auto\n  expected_scale: small\n  relational_complexity: low\n  strict_consistency: false\napproval:\n  status: approved\n  approved_by: owner\n` });
  const { plan } = await buildPlan(dir);
  assert.deepEqual(plan.moduleLock.adapters.identity.map((item) => item.provider), ['google']);
  assert.equal(plan.modules.includes('billing'), false);
  assert.equal(plan.modules.includes('onboarding'), true);
  assert.equal(plan.moduleLock.adapters.database.provider, 'd1');
  assert.equal(plan.codeReady, true);
  assert.equal(plan.productionReady, false);
  assert.ok(plan.warnings.some((warning) => warning.code === 'EXTERNAL_EVIDENCE_REQUIRED'));
  assert.equal(plan.warnings.some((warning) => warning.severity === 'blocker'), false);
});

test('onboarding may be disabled for products that genuinely do not need it', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { product: `version: 3\nname: no-onboarding\nregion: global\ntargets: [web]\nmonetization: free\ncapabilities:\n  onboarding: false\n  background_jobs: false\n  file_uploads: false\n  email: false\n  realtime: false\napproval:\n  status: approved\n  approved_by: owner\n` });
  const { plan } = await buildPlan(dir);
  assert.equal(plan.modules.includes('onboarding'), false);
  assert.equal(plan.releaseEvidence.includes('onboarding-resume-first-value'), false);
});

test('database escape criteria select PostgreSQL plus Hyperdrive', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { product: `version: 3\nname: complex\nregion: global\ntargets: [web]\nmonetization: free\ncapabilities:\n  onboarding: true\n  background_jobs: false\n  file_uploads: false\n  email: false\n  realtime: false\nplatform:\n  database: auto\n  expected_scale: large\n  relational_complexity: high\n  strict_consistency: true\napproval:\n  status: approved\n  approved_by: owner\n` });
  const { plan } = await buildPlan(dir);
  assert.equal(plan.moduleLock.adapters.database.provider, 'postgres-hyperdrive');
  assert.ok(plan.cloudflare.includes('hyperdrive'));
  assert.equal(plan.codeReady, true);
});

test('KR one-time and credits products default to Toss while recurring products default to Stripe', async () => {
  const credits = await tempDir();
  await writeContracts(credits, { product: `version: 3\nname: kr-credits\nregion: kr\ntargets: [web]\nmonetization: credits\npricing:\n  plans:\n    credit-pack:\n      name: Credit Pack\n      billing_mode: credits\n      amount_minor: 9900\n      currency: KRW\n      entitlement_key: credits\n      credit_amount: 100\n      stripe_price_id: null\n      active: true\ncapabilities:\n  onboarding: true\n  background_jobs: false\n  file_uploads: false\n  email: false\n  realtime: false\napproval:\n  status: approved\n  approved_by: owner\n` });
  const creditsPlan = (await buildPlan(credits)).plan;
  assert.equal(creditsPlan.moduleLock.adapters.payment.provider, 'toss');

  const recurring = await tempDir();
  await writeContracts(recurring);
  const recurringPlan = (await buildPlan(recurring)).plan;
  assert.equal(recurringPlan.moduleLock.adapters.payment.provider, 'stripe');
});

test('same contracts resolve to the same profile hash', async () => {
  const dir = await tempDir();
  await writeContracts(dir);
  const first = await buildPlan(dir);
  const second = await buildPlan(dir);
  assert.equal(first.plan.profileHash, second.plan.profileHash);
});
