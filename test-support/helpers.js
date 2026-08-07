import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function tempDir(prefix = 'saasharness-') {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function writeContracts(dir, overrides = {}) {
  await mkdir(dir, { recursive: true });
  const product = overrides.product ?? `version: 3\nname: demo\nregion: kr\ntargets: [web]\nmonetization: subscription-plus-credits\npricing:\n  plans:\n    standard-monthly:\n      name: Standard Monthly\n      billing_mode: subscription\n      amount_minor: 12900\n      currency: KRW\n      entitlement_key: standard\n      credit_amount: 50\n      stripe_price_id: null\n      active: true\ncapabilities:\n  background_jobs: true\n  file_uploads: false\n  email: true\n  realtime: false\nidentity:\n  providers: [kakao]\npayment:\n  provider: unset\nplatform:\n  database: auto\n  expected_scale: small\n  relational_complexity: low\n  strict_consistency: false\n  write_heavy: false\napproval:\n  status: approved\n  approved_by: owner\n`;
  const ux = overrides.ux ?? `version: 1\nprimary_journey:\n  id: first-value\n  goal: Reach value\n  states: [loading, error, success]\nusability_evidence:\n  status: not-validated\napproval:\n  status: approved\n  approved_by: owner\n`;
  const feature = overrides.feature ?? `version: 1\nid: feature-1\nname: First feature\ntouches: [ui, api, db]\nacceptance: [works, recovers]\napproval:\n  status: approved\n  approved_by: owner\n`;
  await Promise.all([
    writeFile(path.join(dir, 'product.yml'), product),
    writeFile(path.join(dir, 'ux.yml'), ux),
    writeFile(path.join(dir, 'feature.yml'), feature),
  ]);
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}
