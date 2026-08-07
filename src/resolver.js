import { createHash } from 'node:crypto';
import { ADAPTERS, MODULES, STARTER_VERSION } from './registry.js';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(stable(value));
}

function selectDatabase(product) {
  const platform = product.platform ?? {};
  if (platform.database === 'd1' || platform.database === 'postgres-hyperdrive') return platform.database;
  const escape = [
    platform.expected_scale === 'large',
    platform.expected_scale === 'enterprise',
    platform.relational_complexity === 'high',
    platform.strict_consistency === true,
    platform.write_heavy === true,
    product.compliance?.requires_external_postgres === true,
  ].some(Boolean);
  return escape ? 'postgres-hyperdrive' : 'd1';
}

function selectIdentity(product) {
  const explicit = product.identity?.providers;
  if (Array.isArray(explicit) && explicit.length) return explicit;
  return product.region === 'kr' ? ['kakao'] : ['google'];
}

function selectPayment(product) {
  if (product.monetization === 'free') return null;
  const explicit = product.payment?.provider;
  if (explicit && explicit !== 'unset') return explicit;
  if (product.region === 'kr' && ['one-time', 'credits'].includes(product.monetization)) return 'toss';
  return 'stripe';
}

function addMonetizationModules(modules, monetization) {
  if (monetization === 'free') return;
  modules.add('billing');
  modules.add('entitlement');
  if (monetization === 'one-time') modules.add('order');
  if (monetization === 'subscription' || monetization === 'subscription-plus-credits') modules.add('subscription');
  if (monetization === 'credits' || monetization === 'subscription-plus-credits') modules.add('credits');
}

function adapterRecord(type, provider) {
  const key = `${type}:${provider}`;
  const metadata = ADAPTERS[key];
  return {
    provider,
    version: metadata?.version ?? 'unregistered',
    status: metadata?.status ?? 'unregistered',
    supports: metadata?.supports ?? null,
    evidence: metadata?.evidence ?? [],
  };
}

function evidenceRequirements(modules, adapters) {
  const requirements = new Set([
    'staging critical journeys',
    'migration and recovery rehearsal',
  ]);
  for (const name of modules) {
    for (const item of MODULES[name]?.evidence ?? []) requirements.add(item);
  }
  for (const adapter of [...adapters.identity, adapters.database, adapters.payment].filter(Boolean)) {
    for (const item of adapter.evidence ?? []) requirements.add(item);
  }
  return [...requirements];
}

export function resolvePlan(contracts) {
  const product = contracts.product.parsed;
  const ux = contracts.ux.parsed;
  const feature = contracts.feature.parsed;
  const modules = new Set(Object.entries(MODULES).filter(([, meta]) => meta.baseline).map(([name]) => name));
  addMonetizationModules(modules, product.monetization);
  if (product.capabilities?.background_jobs) modules.add('jobs');
  if (product.capabilities?.file_uploads) modules.add('storage');
  if (product.capabilities?.email) modules.add('email');
  if (product.capabilities?.realtime) modules.add('realtime');

  const identityProviders = selectIdentity(product);
  const database = selectDatabase(product);
  const paymentProvider = selectPayment(product);

  const adapters = {
    identity: identityProviders.map((provider) => adapterRecord('identity', provider)),
    database: adapterRecord('database', database),
    payment: paymentProvider ? adapterRecord('payment', paymentProvider) : null,
  };

  const cloudflare = ['workers', 'assets'];
  cloudflare.push(database === 'd1' ? 'd1' : 'hyperdrive');
  if (modules.has('jobs')) cloudflare.push('queues');
  if (modules.has('storage')) cloudflare.push('r2');
  if (modules.has('realtime')) cloudflare.push('durable-objects');

  const blockers = [];
  for (const name of modules) {
    const metadata = MODULES[name];
    if (!metadata || metadata.status !== 'implemented') {
      blockers.push({
        severity: 'blocker',
        code: `MODULE_${name.toUpperCase().replaceAll('-', '_')}_NOT_IMPLEMENTED`,
        message: `${name} is selected but its reusable production module is not implemented`,
      });
    }
  }
  for (const adapter of [...adapters.identity, adapters.database, adapters.payment].filter(Boolean)) {
    if (adapter.status !== 'implemented') {
      blockers.push({
        severity: 'blocker',
        code: `ADAPTER_${String(adapter.provider).toUpperCase().replaceAll('-', '_')}_NOT_IMPLEMENTED`,
        message: `${adapter.provider} is selected but has no implemented adapter`,
      });
    }
  }
  if (adapters.payment?.supports && !adapters.payment.supports.includes(product.monetization)) {
    blockers.push({
      severity: 'blocker',
      code: 'PAYMENT_CAPABILITY_MISMATCH',
      message: `${adapters.payment.provider} does not support monetization mode ${product.monetization}; select a compatible adapter`,
    });
  }

  const warnings = [...blockers];
  if (ux.usability_evidence?.status !== 'validated') {
    warnings.push({
      severity: 'warning',
      code: 'USABILITY_NOT_VALIDATED',
      message: 'product-owner approval does not replace target-user usability evidence',
    });
  }
  warnings.push({
    severity: 'evidence',
    code: 'EXTERNAL_EVIDENCE_REQUIRED',
    message: 'the generated implementation is code-complete but remains blocked from production until provider, database, operator, staging, recovery, and explicit human release approval are recorded',
  });

  const moduleLock = {
    starter: STARTER_VERSION,
    modules: Object.fromEntries([...modules].sort().map((name) => [name, MODULES[name].version])),
    adapters,
  };

  const codeReady = blockers.length === 0;
  const releaseEvidence = evidenceRequirements([...modules], adapters);
  const planBase = {
    schemaVersion: 2,
    product: {
      name: product.name,
      region: product.region,
      targets: product.targets,
      monetization: product.monetization,
      paymentProvider,
      database,
    },
    ux: { journey: ux.primary_journey.id, approval: ux.approval.status },
    feature: { id: feature.id, name: feature.name, touches: feature.touches },
    modules: [...modules].sort(),
    cloudflare,
    moduleLock,
    codeReady,
    releaseEvidence,
    warnings,
    productionReady: false,
  };
  const profileHash = createHash('sha256').update(stableJson(planBase)).digest('hex').slice(0, 16);
  return { ...planBase, profileHash };
}
