import path from 'node:path';
import { loadContracts, validateContracts } from './contracts.js';
import { prepareOutput, writeFiles } from './fs-utils.js';
import { resolvePlan } from './resolver.js';
import { starterFiles } from './starter-files.js';

export async function buildPlan(contractDir) {
  const contracts = await loadContracts(contractDir);
  const validation = validateContracts(contracts);
  if (!validation.ok) throw new Error(`contract validation failed:\n- ${validation.errors.join('\n- ')}`);
  const plan = resolvePlan(contracts);
  return { contracts, validation, plan };
}

export async function assembleProject(contractDir, outDir, options = {}) {
  const { contracts, validation, plan } = await buildPlan(contractDir);
  await prepareOutput(outDir, options.force ?? false);
  const raw = {
    product: contracts.product.raw,
    ux: contracts.ux.raw,
    feature: contracts.feature.raw,
  };
  await writeFiles(outDir, starterFiles(plan, raw));
  return { outDir: path.resolve(outDir), validation, plan };
}
