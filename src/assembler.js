import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContracts, validateContracts } from './contracts.js';
import {
  prepareOutput,
  writeFiles,
  copyDirectory,
  copyFile,
  exists,
  removePath,
} from './fs-utils.js';
import { resolvePlan } from './resolver.js';
import { starterFiles } from './starter-files.js';
import { platformConfigFiles } from './platform-config.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function buildPlan(contractDir, options = {}) {
  const contracts = await loadContracts(contractDir);
  const validation = validateContracts(contracts, {
    requiredApprovals: options.prototype ? ['product'] : ['product', 'ux', 'feature'],
  });
  if (!validation.ok) throw new Error(`contract validation failed:\n- ${validation.errors.join('\n- ')}`);
  const plan = resolvePlan(contracts);
  return { contracts, validation, plan };
}

async function normalizeDatabaseArtifacts(outDir, plan) {
  // starterFiles historically emitted a second baseline migration. The platform
  // pack is now the only schema authority, so generated projects can never apply
  // two competing definitions of app_user/audit_event.
  await removePath(path.join(outDir, 'migrations', '0001_base.sql'));
  await removePath(path.join(outDir, 'migrations', 'README.md'));

  const database = plan.moduleLock.adapters.database.provider;
  if (database === 'd1') {
    await removePath(path.join(outDir, 'migrations', 'postgres'));
  } else if (database === 'postgres-hyperdrive') {
    await removePath(path.join(outDir, 'migrations', 'd1'));
    // Keep a compatibility copy for tools that expect migrations/ at the root.
    const source = path.join(outDir, 'migrations', 'postgres');
    if (!await exists(source)) {
      throw new Error('postgres-hyperdrive profile requires migrations/postgres');
    }
  }
}

export async function assembleProject(contractDir, outDir, options = {}) {
  const { contracts, validation, plan } = await buildPlan(contractDir, options);
  await prepareOutput(outDir, options.force ?? false);

  if (options.baseTemplateDir) {
    const baseTemplateDir = path.resolve(options.baseTemplateDir);
    if (!await exists(baseTemplateDir)) throw new Error(`upstream base template not found: ${baseTemplateDir}`);
    await copyDirectory(baseTemplateDir, outDir);
  }

  const raw = {
    product: contracts.product.raw,
    ux: contracts.ux.raw,
    feature: contracts.feature.raw,
  };

  await writeFiles(outDir, starterFiles(plan, raw));
  await copyDirectory(path.join(packageRoot, 'templates', 'platform'), outDir);
  await normalizeDatabaseArtifacts(outDir, plan);
  await writeFiles(outDir, platformConfigFiles(plan));
  await copyDirectory(path.join(packageRoot, 'skills'), path.join(outDir, '.agents', 'skills'));
  await copyDirectory(path.join(packageRoot, 'integrations'), path.join(outDir, '.saasharness', 'upstreams'));
  await copyFile(path.join(packageRoot, 'upstreams.lock.json'), path.join(outDir, '.saasharness', 'upstreams.lock.json'));

  return {
    outDir: path.resolve(outDir),
    validation,
    plan,
    baseTemplateDir: options.baseTemplateDir ? path.resolve(options.baseTemplateDir) : null,
  };
}
