import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pinnedIntegrationPlan } from '../src/upstream-installers.js';

test('Spec Kit and Impeccable installers execute from pinned local checkouts', () => {
  const root = path.resolve('/tmp/project');
  const specKit = pinnedIntegrationPlan('spec-kit', root, 'codex');
  assert.equal(specKit.steps[0][1][1], path.join(root, '.saasharness', 'sources', 'spec-kit'));
  assert.equal(specKit.steps[0][1].includes('github.com'), false);

  const impeccable = pinnedIntegrationPlan('impeccable', root, 'codex');
  assert.equal(impeccable.steps[0][0], 'npm');
  assert.ok(impeccable.steps[0][1].includes(`file:${path.join(root, '.saasharness', 'sources', 'impeccable')}`));
});

test('Open Design installer uses the checked-out daemon entrypoint', () => {
  const root = path.resolve('/tmp/project');
  const plan = pinnedIntegrationPlan('open-design', root, 'codex');
  assert.equal(plan.steps[0][0], 'pnpm');
  assert.equal(plan.steps[1][0], 'node');
  assert.match(plan.steps[1][1][0], /open-design.*apps.*daemon.*od\.mjs/);
});

test('Superpowers remains an official provider plugin rather than an invented local runner', () => {
  const plan = pinnedIntegrationPlan('superpowers', '/tmp/project', 'codex');
  assert.deepEqual(plan.steps, []);
  assert.match(plan.instructions, /official provider plugin/);
});
