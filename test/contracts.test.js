import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan } from '../src/assembler.js';
import { tempDir, writeContracts } from '../test-support/helpers.js';

test('approved contracts validate and preserve usability warning', async () => {
  const dir = await tempDir();
  await writeContracts(dir);
  const { validation } = await buildPlan(dir);
  assert.equal(validation.ok, true);
  assert.ok(validation.warnings.some((warning) => /usability evidence/i.test(warning)));
});

test('draft UX blocks strict planning', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { ux: `version: 2\nprimary_journey:\n  id: first\n  goal: Reach value\n  states: [success]\nreact_mock:\n  status: draft\napproval:\n  status: draft\n  approved_by: owner\n` });
  await assert.rejects(() => buildPlan(dir), /ux\.approval\.status must be approved/);
});

test('prototype planning allows draft UX and feature after product approval', async () => {
  const dir = await tempDir();
  await writeContracts(dir, {
    ux: `version: 2\nprimary_journey:\n  id: first\n  goal: Reach value\n  states: [success]\nreact_mock:\n  status: draft\napproval:\n  status: draft\n  approved_by: owner\n`,
    feature: `version: 2\nid: feature-1\nname: First feature\ntouches: [ui]\nacceptance: [works]\napproval:\n  status: draft\n  approved_by: owner\n`,
  });
  const { validation } = await buildPlan(dir, { prototype: true });
  assert.equal(validation.ok, true);
  assert.ok(validation.warnings.some((warning) => /ux is still draft/i.test(warning)));
});

test('mobile target is rejected by the web-only golden path', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { product: `version: 3\nname: demo\nregion: global\ntargets: [web, mobile]\nmonetization: free\napproval:\n  status: approved\n  approved_by: owner\n` });
  await assert.rejects(() => buildPlan(dir), /unsupported targets: mobile/);
});

test('identity providers are optional and resolved from region defaults', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { product: `version: 3\nname: global-free\nregion: global\ntargets: [web]\nmonetization: free\ncapabilities:\n  background_jobs: false\n  file_uploads: false\n  email: false\n  realtime: false\nplatform:\n  database: auto\napproval:\n  status: approved\n  approved_by: owner\n` });
  const { plan } = await buildPlan(dir);
  assert.deepEqual(plan.moduleLock.adapters.identity.map((adapter) => adapter.provider), ['google']);
});

test('monetized contracts require executable pricing plans', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { product: `version: 3\nname: paid\nregion: global\ntargets: [web]\nmonetization: subscription\ncapabilities:\n  background_jobs: false\n  file_uploads: false\n  email: false\n  realtime: false\napproval:\n  status: approved\n  approved_by: owner\n` });
  await assert.rejects(() => buildPlan(dir), /pricing\.plans must define at least one paid plan/i);
});
