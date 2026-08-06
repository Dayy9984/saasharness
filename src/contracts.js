import path from 'node:path';
import { readUtf8 } from './fs-utils.js';
import { parseYamlLite } from './yaml-lite.js';

export const CONTRACT_FILES = Object.freeze({
  product: 'product.yml',
  ux: 'ux.yml',
  feature: 'feature.yml',
});

const MONETIZATION = new Set(['free', 'one-time', 'subscription', 'credits', 'subscription-plus-credits']);
const REGIONS = new Set(['kr', 'global']);
const TARGETS = new Set(['web']);

function requireString(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${label} must be a non-empty string`);
}

function requireApproval(contract, label, errors) {
  if (!contract.approval || contract.approval.status !== 'approved') {
    errors.push(`${label}.approval.status must be approved`);
  }
  requireString(contract.approval?.approved_by, `${label}.approval.approved_by`, errors);
}

export async function loadContracts(contractDir) {
  const entries = await Promise.all(
    Object.entries(CONTRACT_FILES).map(async ([key, fileName]) => {
      const filePath = path.join(contractDir, fileName);
      const raw = await readUtf8(filePath).catch(() => {
        throw new Error(`missing contract: ${filePath}`);
      });
      return [key, parseYamlLite(raw, fileName), raw];
    }),
  );
  return Object.fromEntries(entries.map(([key, parsed, raw]) => [key, { parsed, raw }]));
}

export function validateContracts(contracts) {
  const product = contracts.product.parsed;
  const ux = contracts.ux.parsed;
  const feature = contracts.feature.parsed;
  const errors = [];
  const warnings = [];

  requireString(product.name, 'product.name', errors);
  if (!REGIONS.has(product.region)) errors.push('product.region must be kr or global');
  if (!MONETIZATION.has(product.monetization)) errors.push(`product.monetization must be one of ${[...MONETIZATION].join(', ')}`);
  if (!Array.isArray(product.targets) || product.targets.length === 0) errors.push('product.targets must contain web');
  else {
    const unsupported = product.targets.filter((target) => !TARGETS.has(target));
    if (unsupported.length) errors.push(`unsupported targets in v0.1: ${unsupported.join(', ')}`);
    if (!product.targets.includes('web')) errors.push('product.targets must include web');
  }
  requireApproval(product, 'product', errors);

  requireString(ux.primary_journey?.id, 'ux.primary_journey.id', errors);
  requireString(ux.primary_journey?.goal, 'ux.primary_journey.goal', errors);
  if (!Array.isArray(ux.primary_journey?.states) || ux.primary_journey.states.length === 0) {
    errors.push('ux.primary_journey.states must be a non-empty list');
  }
  requireApproval(ux, 'ux', errors);
  if (ux.usability_evidence?.status !== 'validated') {
    warnings.push('target-user usability evidence is not validated; product-owner approval is not usability proof');
  }

  requireString(feature.id, 'feature.id', errors);
  requireString(feature.name, 'feature.name', errors);
  if (!Array.isArray(feature.touches) || feature.touches.length === 0) errors.push('feature.touches must be a non-empty list');
  if (!Array.isArray(feature.acceptance) || feature.acceptance.length === 0) errors.push('feature.acceptance must be a non-empty list');
  requireApproval(feature, 'feature', errors);

  return { ok: errors.length === 0, errors, warnings };
}
