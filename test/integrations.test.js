import test from 'node:test';
import assert from 'node:assert/strict';
import { listIntegrations, integrationCommand } from '../src/integrations.js';

test('Spec Kit, Superpowers, and Impeccable are canonical default upstreams', () => {
  const integrations = listIntegrations();
  assert.equal(integrations['spec-kit'].default, true);
  assert.equal(integrations['spec-kit'].required, true);
  assert.equal(integrations['spec-kit'].role, 'canonical-planning-host');
  assert.equal(integrations.superpowers.default, true);
  assert.equal(integrations.superpowers.required, true);
  assert.equal(integrations.superpowers.role, 'canonical-implementation-host');
  assert.equal(integrations.impeccable.default, true);
  assert.equal(integrations.impeccable.required, true);
  assert.equal(integrations.impeccable.role, 'canonical-ui-critic');
});

test('Spec Kit integration initializes upstream and installs the B2C preset', () => {
  const result = integrationCommand('spec-kit', 'codex', '/tmp/project');
  assert.equal(result.steps.length, 2);
  assert.deepEqual(result.steps[0].executable.slice(-4), ['init', '.', '--integration', 'codex']);
  assert.equal(result.steps[1].executable.includes('preset'), true);
  assert.equal(result.steps[1].executable.at(-1).endsWith('.saasharness/upstreams/spec-kit-b2c'), true);
});

test('Open Design and OpenSpec have bounded lifecycle roles', () => {
  const integrations = listIntegrations();
  assert.equal(integrations['open-design'].default, true);
  assert.deepEqual(integrations['open-design'].requiredFor, ['ux-ia']);
  assert.equal(integrations.openspec.default, true);
  assert.equal(integrations.openspec.requiredAfter, 'first approved production baseline');
});

test('GSD, Meta-Harness, and Hermes are not always-on runtime dependencies', () => {
  const integrations = listIntegrations();
  assert.equal(integrations['gsd-core'].default, false);
  assert.match(integrations['gsd-core'].activation, /only when/);
  assert.equal(integrations['meta-harness'].default, false);
  assert.equal(integrations['meta-harness'].mode, 'separate-research-lab');
  assert.equal(integrations['hermes-agent'].default, false);
  assert.equal(integrations['hermes-agent'].mode, 'optional-research-backend');
});

test('money-path code ports and SaaS inventory keep their upstream provenance', () => {
  const integrations = listIntegrations();
  assert.equal(integrations['ai-saas-starter'].mode, 'source-level-port-with-attribution');
  assert.deepEqual(integrations['ai-saas-starter'].requiredFor, ['billing', 'credits']);
  assert.equal(integrations['open-saas'].mode, 'reference-profile');
});

test('Impeccable command is pinned', () => {
  const result = integrationCommand('impeccable', 'codex', '.');
  assert.deepEqual(result.steps[0].executable.slice(0, 4), ['npx', '-y', 'impeccable@3.5.0', 'install']);
});

test('UI UX Pro Max requires license review and is not default', () => {
  const integrations = listIntegrations();
  assert.equal(integrations['ui-ux-pro-max'].default, false);
  assert.equal(integrations['ui-ux-pro-max'].license, 'REVIEW_REQUIRED');
});
