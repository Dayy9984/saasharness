import test from 'node:test';
import assert from 'node:assert/strict';
import { listIntegrations, integrationCommand } from '../src/integrations.js';

test('impeccable is the default external design critic integration', () => {
  const integrations = listIntegrations();
  assert.equal(integrations.impeccable.default, true);
  assert.equal(integrations.impeccable.license, 'Apache-2.0');
});

test('ui ux pro max requires license review and is not default', () => {
  const integrations = listIntegrations();
  assert.equal(integrations['ui-ux-pro-max'].default, false);
  assert.equal(integrations['ui-ux-pro-max'].license, 'REVIEW_REQUIRED');
});

test('impeccable command is pinned', () => {
  const result = integrationCommand('impeccable', 'codex');
  assert.deepEqual(result.executable.slice(0, 4), ['npx', '-y', 'impeccable@3.5.0', 'install']);
});
