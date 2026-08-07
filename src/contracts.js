import path from 'node:path';
import { readUtf8 } from './fs-utils.js';
import { parseYamlLite } from './yaml-lite.js';
import { validatePricingPlans } from './pricing.js';

export const CONTRACT_FILES = Object.freeze({
  product: 'product.yml',
  ux: 'ux.yml',
  feature: 'feature.yml',
});

const MONETIZATION = new Set(['free', 'one-time', 'subscription', 'credits', 'subscription-plus-credits']);
const REGIONS = new Set(['kr', 'global']);
const TARGETS = new Set(['web']);
const DATABASES = new Set(['auto', 'd1', 'postgres-hyperdrive']);
const PAYMENT_PROVIDERS = new Set(['unset', 'stripe', 'toss']);
const IDENTITY_PROVIDERS = new Set(['google', 'kakao']);

function requireString(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${label} must be a non-empty string`);
}

function approvalStatus(contract) {
  return contract.approval?.status ?? 'missing';
}

function requireApproval(contract, label, errors) {
  if (!contract.approval || contract.approval.status !== 'approved') {
    errors.push(`${label}.approval.status must be approved`);
  }
  requireString(contract.approval?.approved_by, `${label}.approval.approved_by`, errors);
}

function validateUxDesignLifecycle(ux, strict, errors, warnings) {
  if ((ux.version ?? 1) < 3) {
    warnings.push('legacy UX contract detected; migrate to the SOUL → 15 themes → prototype lifecycle');
    return;
  }
  const checks = [
    ['ux.design_philosophy.status', ux.design_philosophy?.status],
    ['ux.theme_exploration.status', ux.theme_exploration?.status],
    ['ux.theme_selection.status', ux.theme_selection?.status],
    ['ux.react_mock.status', ux.react_mock?.status],
  ];
  for (const [label, status] of checks) {
    if (status === 'approved') continue;
    if (strict) errors.push(`${label} must be approved before strict assembly`);
    else warnings.push(`${label} is not approved; stay in the React UX workflow`);
  }
  const count = ux.theme_exploration?.candidate_count;
  if (count !== 15) {
    if (strict) errors.push('ux.theme_exploration.candidate_count must be exactly 15');
    else warnings.push('theme exploration must produce exactly 15 same-screen variants before selection');
  }
  if (ux.theme_exploration?.automated_scraping && ux.theme_exploration.automated_scraping !== 'forbidden') {
    errors.push('ux.theme_exploration.automated_scraping must be forbidden');
  }
}

function validateProductPlatform(product, errors) {
  const providers = product.identity?.providers;
  // Identity is a product-policy override, not a required technical question.
  // When omitted, the resolver applies the certified regional default:
  // Kakao for KR and Google for global.
  if (providers !== undefined) {
    if (!Array.isArray(providers) || providers.length === 0) {
      errors.push('product.identity.providers must be omitted or contain at least one supported provider');
    } else {
      const unsupported = providers.filter((provider) => !IDENTITY_PROVIDERS.has(provider));
      if (unsupported.length) errors.push(`unsupported identity providers: ${unsupported.join(', ')}`);
      if (new Set(providers).size !== providers.length) errors.push('product.identity.providers must not contain duplicates');
    }
  }
  const payment = product.payment?.provider ?? 'unset';
  if (!PAYMENT_PROVIDERS.has(payment)) errors.push('product.payment.provider must be unset, stripe, or toss');
  const database = product.platform?.database ?? 'auto';
  if (!DATABASES.has(database)) errors.push('product.platform.database must be auto, d1, or postgres-hyperdrive');
  for (const capability of ['background_jobs', 'file_uploads', 'email', 'realtime']) {
    const value = product.capabilities?.[capability];
    if (value !== undefined && typeof value !== 'boolean') {
      errors.push(`product.capabilities.${capability} must be true or false`);
    }
  }
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

export function validateContracts(contracts, options = {}) {
  const product = contracts.product.parsed;
  const ux = contracts.ux.parsed;
  const feature = contracts.feature.parsed;
  const requiredApprovals = new Set(options.requiredApprovals ?? ['product', 'ux', 'feature']);
  const errors = [];
  const warnings = [];

  requireString(product.name, 'product.name', errors);
  if (!REGIONS.has(product.region)) errors.push('product.region must be kr or global');
  if (!MONETIZATION.has(product.monetization)) errors.push(`product.monetization must be one of ${[...MONETIZATION].join(', ')}`);
  if (!Array.isArray(product.targets) || product.targets.length === 0) errors.push('product.targets must contain web');
  else {
    const unsupported = product.targets.filter((target) => !TARGETS.has(target));
    if (unsupported.length) errors.push(`unsupported targets: ${unsupported.join(', ')}`);
    if (!product.targets.includes('web')) errors.push('product.targets must include web');
  }
  validateProductPlatform(product, errors);
  validatePricingPlans(product, errors, warnings);

  requireString(ux.primary_journey?.id, 'ux.primary_journey.id', errors);
  requireString(ux.primary_journey?.goal, 'ux.primary_journey.goal', errors);
  if (!Array.isArray(ux.primary_journey?.states) || ux.primary_journey.states.length === 0) {
    errors.push('ux.primary_journey.states must be a non-empty list');
  }
  if ((ux.version ?? 1) >= 3 && ux.design_philosophy?.soul_file !== 'SOUL.md') {
    warnings.push('SOUL.md should be the canonical design-philosophy source');
  }
  validateUxDesignLifecycle(ux, requiredApprovals.has('ux'), errors, warnings);
  if (ux.usability_evidence?.status !== 'validated') {
    warnings.push('target-user usability evidence is not validated; product-owner approval is not usability proof');
  }

  requireString(feature.id, 'feature.id', errors);
  requireString(feature.name, 'feature.name', errors);
  if (!Array.isArray(feature.touches) || feature.touches.length === 0) errors.push('feature.touches must be a non-empty list');
  if (!Array.isArray(feature.acceptance) || feature.acceptance.length === 0) errors.push('feature.acceptance must be a non-empty list');

  for (const [label, contract] of [['product', product], ['ux', ux], ['feature', feature]]) {
    if (requiredApprovals.has(label)) requireApproval(contract, label, errors);
    else if (approvalStatus(contract) !== 'approved') warnings.push(`${label} is still draft; the workflow must obtain human approval before implementation`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
