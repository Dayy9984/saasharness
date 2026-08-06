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
  await access(path.join(output, 'src/worker/index.ts'));
  await access(path.join(output, 'wrangler.jsonc'));
  await assert.rejects(() => access(path.join(output, 'mobile')));
  const lock = await readJson(path.join(output, 'module-lock.json'));
  assert.equal(lock.starter, 'b2c-react-cloudflare@0.1.0');
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
