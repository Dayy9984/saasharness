import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan } from '../src/assembler.js';
import { tempDir, writeContracts } from '../test-support/helpers.js';

test('KR subscription plus credits selects Kakao and money modules', async () => {
  const dir = await tempDir();
  await writeContracts(dir);
  const { plan } = await buildPlan(dir);
  assert.deepEqual(plan.moduleLock.adapters.identity.map((item) => item.provider), ['kakao']);
  assert.ok(plan.modules.includes('billing'));
  assert.ok(plan.modules.includes('subscription'));
  assert.ok(plan.modules.includes('credits'));
  assert.equal(plan.productionReady, false);
});

test('global free product defaults to Google without billing', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { product: `version: 1\nname: global-free\nregion: global\ntargets: [web]\nmonetization: free\ncapabilities:\n  background_jobs: false\n  file_uploads: false\nplatform:\n  database: auto\n  expected_scale: small\n  relational_complexity: low\n  strict_consistency: false\napproval:\n  status: approved\n  approved_by: owner\n` });
  const { plan } = await buildPlan(dir);
  assert.deepEqual(plan.moduleLock.adapters.identity.map((item) => item.provider), ['google']);
  assert.equal(plan.modules.includes('billing'), false);
  assert.equal(plan.moduleLock.adapters.database.provider, 'd1');
  assert.equal(plan.productionReady, true);
});

test('database escape criteria select PostgreSQL plus Hyperdrive', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { product: `version: 1\nname: complex\nregion: global\ntargets: [web]\nmonetization: free\nplatform:\n  database: auto\n  expected_scale: large\n  relational_complexity: high\n  strict_consistency: true\napproval:\n  status: approved\n  approved_by: owner\n` });
  const { plan } = await buildPlan(dir);
  assert.equal(plan.moduleLock.adapters.database.provider, 'postgres-hyperdrive');
  assert.ok(plan.cloudflare.includes('hyperdrive'));
});

test('same contracts resolve to the same profile hash', async () => {
  const dir = await tempDir();
  await writeContracts(dir);
  const first = await buildPlan(dir);
  const second = await buildPlan(dir);
  assert.equal(first.plan.profileHash, second.plan.profileHash);
});
