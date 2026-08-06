import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { assembleProject } from '../src/assembler.js';
import { tempDir, writeContracts, readJson } from '../test-support/helpers.js';

test('assembler creates deterministic web-only Cloudflare workspace', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const output = path.join(root, 'generated');
  await writeContracts(contracts);
  const result = await assembleProject(contracts, output);
  assert.equal(result.plan.product.targets.includes('web'), true);
  await access(path.join(output, 'src/react/App.tsx'));
  await access(path.join(output, 'src/react/ux-lab/UxLab.tsx'));
  await access(path.join(output, 'src/worker/index.ts'));
  await access(path.join(output, 'wrangler.jsonc'));
  await assert.rejects(() => access(path.join(output, 'mobile')));
  const lock = await readJson(path.join(output, 'module-lock.json'));
  assert.equal(lock.starter, 'b2c-react-cloudflare@0.3.0');
});

test('assembler installs workflow artifacts and universal skills', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const output = path.join(root, 'generated');
  await writeContracts(contracts);
  await assembleProject(contracts, output);
  await access(path.join(output, '.saasharness/workflow.json'));
  await access(path.join(output, '.saasharness/critic-policy.json'));
  await access(path.join(output, 'artifacts/01-product/prd.md'));
  await access(path.join(output, 'artifacts/02-ux/ia.md'));
  await access(path.join(output, 'artifacts/03-architecture/db-model.md'));
  await access(path.join(output, 'artifacts/04-plan/tasks.md'));
  await access(path.join(output, '.agents/skills/b2c-critic/SKILL.md'));
  await access(path.join(output, '.agents/skills/pro-ui-engineering/SKILL.md'));
  await access(path.join(output, '.agents/skills/b2c-change-management/SKILL.md'));
  await access(path.join(output, '.agents/skills/b2c-context-execution/SKILL.md'));
  const policy = await readJson(path.join(output, '.saasharness/critic-policy.json'));
  assert.deepEqual(policy['ux-ia'].channels, ['experience', 'design', 'browser-evidence']);
});

test('assembler ships the pinned upstream manifest and actual Spec Kit preset', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const output = path.join(root, 'generated');
  await writeContracts(contracts);
  await assembleProject(contracts, output);
  const upstreams = await readJson(path.join(output, '.saasharness/upstreams.lock.json'));
  assert.equal(upstreams.policy.strategy, 'upstream-first');
  assert.equal(upstreams.upstreams['spec-kit'].required, true);
  assert.equal(upstreams.upstreams.superpowers.required, true);
  assert.equal(upstreams.upstreams['pro-ui-engineering'].repository, 'yzfly/pro-ui-engineering-skill');
  assert.match(upstreams.upstreams['agent-startup-kit'].mode, /not integrated/);
  await access(path.join(output, '.saasharness/upstreams/spec-kit-b2c/preset.yml'));
  await access(path.join(output, '.saasharness/upstreams/spec-kit-b2c/templates/spec-template.md'));
  await access(path.join(output, '.saasharness/upstreams/spec-kit-b2c/templates/plan-template.md'));
  await access(path.join(output, '.saasharness/upstreams/spec-kit-b2c/templates/tasks-template.md'));
});

test('generated UI visibly warns when provider adapters block production', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const output = path.join(root, 'generated');
  await writeContracts(contracts);
  await assembleProject(contracts, output);
  const app = await readFile(path.join(output, 'src/react/App.tsx'), 'utf8');
  assert.match(app, /Provider adapters are not production-ready/);
});
