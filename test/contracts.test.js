import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan } from '../src/assembler.js';
import { tempDir, writeContracts } from '../test-support/helpers.js';

test('approved contracts validate and preserve usability warning', async () => {
  const dir = await tempDir();
  await writeContracts(dir);
  const { validation } = await buildPlan(dir);
  assert.equal(validation.ok, true);
  assert.match(validation.warnings[0], /usability evidence/i);
});

test('draft UX blocks assembly', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { ux: `version: 1\nprimary_journey:\n  id: first\n  goal: Reach value\n  states: [success]\napproval:\n  status: draft\n  approved_by: owner\n` });
  await assert.rejects(() => buildPlan(dir), /ux\.approval\.status must be approved/);
});

test('mobile target is rejected in web-first v0.1', async () => {
  const dir = await tempDir();
  await writeContracts(dir, { product: `version: 1\nname: demo\nregion: global\ntargets: [web, mobile]\nmonetization: free\napproval:\n  status: approved\n  approved_by: owner\n` });
  await assert.rejects(() => buildPlan(dir), /unsupported targets in v0\.1: mobile/);
});
