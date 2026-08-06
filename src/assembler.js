import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContracts, validateContracts } from './contracts.js';
import { prepareOutput, writeFiles, copyDirectory } from './fs-utils.js';
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

export async function assembleProject(contractDir, outDir, options = {}) {
  const { contracts, validation, plan } = await buildPlan(contractDir, options);
  await prepareOutput(outDir, options.force ?? false);
  const raw = {
    product: contracts.product.raw,
    ux: contracts.ux.raw,
    feature: contracts.feature.raw,
  };

  await writeFiles(outDir, starterFiles(plan, raw));
  await copyDirectory(path.join(packageRoot, 'templates', 'platform'), outDir);
  await writeFiles(outDir, platformConfigFiles(plan));
  await copyDirectory(path.join(packageRoot, 'skills'), path.join(outDir, '.agents', 'skills'));

  return { outDir: path.resolve(outDir), validation, plan };
}
