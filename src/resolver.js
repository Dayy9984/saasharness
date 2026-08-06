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

function addMonetizationModules(modules, monetization) {
  if (monetization === 'free') return;
  modules.add('billing');
  modules.add('entitlement');
  if (monetization === 'one-time') modules.add('order');
  if (monetization === 'subscription' || monetization === 'subscription-plus-credits') modules.add('subscription');
  if (monetization === 'credits' || monetization === 'subscription-plus-credits') modules.add('credits');
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
  const monetized = product.monetization !== 'free';
  const paymentProvider = product.payment?.provider && product.payment.provider !== 'unset'
    ? product.payment.provider
    : `${product.region}-unresolved`;

  const adapters = {
    identity: identityProviders.map((provider) => ({
      provider,
      version: ADAPTERS[`identity:${provider}`]?.version ?? 'unregistered',
      status: ADAPTERS[`identity:${provider}`]?.status ?? 'unregistered',
    })),
    database: {
      provider: database,
      version: ADAPTERS[`database:${database}`]?.version ?? 'unregistered',
      status: ADAPTERS[`database:${database}`]?.status ?? 'unregistered',
    },
    payment: monetized ? {
      provider: paymentProvider,
      version: ADAPTERS[`payment:${paymentProvider}`]?.version ?? 'unregistered',
      status: ADAPTERS[`payment:${paymentProvider}`]?.status ?? 'unregistered',
    } : null,
  };

  const cloudflare = ['workers', 'assets'];
  cloudflare.push(database === 'd1' ? 'd1' : 'hyperdrive');
  if (modules.has('jobs')) cloudflare.push('queues');
  if (modules.has('storage')) cloudflare.push('r2');
  if (modules.has('realtime')) cloudflare.push('durable-objects');

  const warnings = [];
  if (adapters.identity.some((adapter) => adapter.status !== 'production')) {
    warnings.push({ severity: 'warning', code: 'IDENTITY_CONTRACT_ONLY', message: 'identity adapters are contract stubs in v0.1 and require real provider integration' });
  }
  if (monetized && adapters.payment.status !== 'production') {
    warnings.push({ severity: 'blocker', code: 'PAYMENT_ADAPTER_UNRESOLVED', message: 'select and validate a live market payment adapter before production' });
  }
  if (ux.usability_evidence?.status !== 'validated') {
    warnings.push({ severity: 'warning', code: 'USABILITY_NOT_VALIDATED', message: 'product-owner approval does not replace target-user usability evidence' });
  }

  const moduleLock = {
    starter: STARTER_VERSION,
    modules: Object.fromEntries([...modules].sort().map((name) => [name, MODULES[name].version])),
    adapters,
  };

  const planBase = {
    schemaVersion: 1,
    product: { name: product.name, region: product.region, targets: product.targets, monetization: product.monetization },
    ux: { journey: ux.primary_journey.id, approval: ux.approval.status },
    feature: { id: feature.id, name: feature.name, touches: feature.touches },
    modules: [...modules].sort(),
    cloudflare,
    moduleLock,
    warnings,
    productionReady: !warnings.some((warning) => warning.severity === 'blocker'),
  };
  const profileHash = createHash('sha256').update(stableJson(planBase)).digest('hex').slice(0, 16);
  return { ...planBase, profileHash };
}
