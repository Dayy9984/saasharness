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
  await access(path.join(output, 'src/react/ux-lab/ThemeGallery.tsx'));
  await access(path.join(output, 'src/react/ux-lab/ProductPrototype.tsx'));
  await access(path.join(output, 'src/worker/index.ts'));
  await access(path.join(output, 'wrangler.jsonc'));
  await assert.rejects(() => access(path.join(output, 'mobile')));
  const lock = await readJson(path.join(output, 'module-lock.json'));
  assert.equal(lock.starter, 'b2c-react-cloudflare@0.3.0');
});

test('assembler installs staged design artifacts, critic workflow, and skills', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const output = path.join(root, 'generated');
  await writeContracts(contracts);
  await assembleProject(contracts, output);
  await access(path.join(output, 'SOUL.md'));
  await access(path.join(output, 'artifacts/02-ux/pinterest-research.yml'));
  await access(path.join(output, 'artifacts/02-ux/theme-selection.yml'));
  await access(path.join(output, '.agents/skills/b2c-design-research/SKILL.md'));
  const policy = await readJson(path.join(output, '.saasharness/critic-policy.json'));
  assert.deepEqual(policy['ux-themes'].channels, ['research-integrity', 'theme-diversity', 'browser-evidence']);
  const themes = await readJson(path.join(output, 'src/react/ux-lab/theme-catalog.json'));
  assert.equal(themes.length, 15);
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
  await access(path.join(output, '.saasharness/upstreams/spec-kit-b2c/preset.yml'));
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
