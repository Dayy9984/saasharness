import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { tempDir, writeContracts } from '../test-support/helpers.js';
import { assembleProject } from '../src/assembler.js';

test('assembler installs operational platform modules and browser verifier', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const output = path.join(root, 'generated');
  await writeContracts(contracts);
  await assembleProject(contracts, output);
  for (const file of [
    'src/modules/identity/service.ts',
    'src/modules/billing/service.ts',
    'src/modules/credits/service.ts',
    'src/modules/admin-support/routes.ts',
    'src/modules/privacy/routes.ts',
    'migrations/0001_platform.sql',
    'playwright.config.ts',
    'e2e/ux-lab.spec.ts',
    '.github/workflows/deploy.yml',
  ]) await access(path.join(output, file));
  const migration = await readFile(path.join(output, 'migrations/0001_platform.sql'), 'utf8');
  assert.match(migration, /credit_ledger is append-only/);
  const identity = await readFile(path.join(output, 'src/modules/identity/service.ts'), 'utf8');
  assert.match(identity, /verifyOidcIdToken/);
  const billing = await readFile(path.join(output, 'src/modules/billing/adapters.ts'), 'utf8');
  assert.match(billing, /idempotency-key/);
});
