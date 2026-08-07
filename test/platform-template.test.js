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
    'src/platform/database.ts',
    'src/modules/identity/service.ts',
    'src/modules/billing/service.ts',
    'src/modules/credits/service.ts',
    'src/modules/jobs/service.ts',
    'src/modules/email/service.ts',
    'src/modules/onboarding/service.ts',
    'src/modules/onboarding/OnboardingPage.tsx',
    'src/modules/onboarding/onboarding.css',
    'src/modules/admin-support/routes.ts',
    'src/modules/privacy/routes.ts',
    'migrations/d1/0001_platform.sql',
    'migrations/d1/0002_billing_customer.sql',
    'migrations/d1/0003_analytics.sql',
    'migrations/d1/0004_jobs_email.sql',
    'migrations/d1/0006_plan_catalog.sql',
    'migrations/d1/0007_onboarding.sql',
    'test/apply-migrations.ts',
    'tests/credits.integration.test.ts',
    'tests/billing.integration.test.ts',
    'tests/identity.integration.test.ts',
    'tests/onboarding.integration.test.ts',
    'playwright.config.ts',
    'e2e/ux-lab.spec.ts',
    '.github/workflows/deploy.yml',
    '.github/workflows/ui-finish.yml',
    'docs/ui-source-policy.md',
  ]) await access(path.join(output, file));
  await assert.rejects(() => access(path.join(output, 'migrations/postgres')));

  const migration = await readFile(path.join(output, 'migrations/d1/0001_platform.sql'), 'utf8');
  assert.match(migration, /credit_ledger is append-only/);
  assert.match(migration, /webhook_inbox/);
  const pricing = await readFile(path.join(output, 'migrations/d1/0006_plan_catalog.sql'), 'utf8');
  assert.match(pricing, /standard-monthly/);
  const identity = await readFile(path.join(output, 'src/modules/identity/service.ts'), 'utf8');
  assert.match(identity, /verifyOidcIdToken/);
  assert.match(identity, /code_verifier/);
  const billing = await readFile(path.join(output, 'src/modules/billing/adapters.ts'), 'utf8');
  assert.match(billing, /idempotency-key/);
  assert.match(billing, /billing_portal/);
  const packageJson = JSON.parse(await readFile(path.join(output, 'package.json'), 'utf8'));
  assert.equal(packageJson.dependencies['@onboardjs/core'], '1.0.0-rc.4');
  assert.equal(packageJson.dependencies['@onboardjs/react'], '1.0.0-rc.5');
  const uiPolicy = await readFile(path.join(output, 'docs/ui-source-policy.md'), 'utf8');
  assert.match(uiPolicy, /no-slop-ui/);
  assert.match(uiPolicy, /localized exception/);
});
