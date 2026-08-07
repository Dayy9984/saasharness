export const STARTER_VERSION = 'b2c-react-cloudflare@1.0.0';

export const MODULES = Object.freeze({
  identity: { version: '1.0.0', baseline: true, status: 'implemented', evidence: ['provider-sandbox'] },
  analytics: { version: '1.0.0', baseline: true, status: 'implemented', evidence: ['field-telemetry'] },
  'admin-support': { version: '1.0.0', baseline: true, status: 'implemented', evidence: ['operator-journey'] },
  privacy: { version: '1.0.0', baseline: true, status: 'implemented', evidence: ['deletion-export-journey'] },
  audit: { version: '1.0.0', baseline: true, status: 'implemented', evidence: ['tamper-review'] },
  observability: { version: '1.0.0', baseline: true, status: 'implemented', evidence: ['dashboard-alerts'] },
  'release-support': { version: '1.0.0', baseline: true, status: 'implemented', evidence: ['staging-promotion-recovery'] },
  order: { version: '1.0.0', status: 'implemented', evidence: ['payment-sandbox'] },
  billing: { version: '1.0.0', status: 'implemented', evidence: ['payment-sandbox', 'refund-journey'] },
  subscription: { version: '1.0.0', status: 'implemented', evidence: ['subscription-lifecycle'] },
  entitlement: { version: '1.0.0', status: 'implemented', evidence: ['provider-replay'] },
  credits: { version: '1.0.0', status: 'implemented', evidence: ['race-replay-refund'] },
  jobs: { version: '1.0.0', status: 'implemented', evidence: ['queue-retry-and-idempotency'] },
  email: { version: '1.0.0', status: 'implemented', evidence: ['transactional-email-delivery'] },
  storage: { version: '0.2.0', status: 'contract-only' },
  realtime: { version: '0.2.0', status: 'contract-only' },
});

export const ADAPTERS = Object.freeze({
  'identity:kakao': { version: '1.0.0', status: 'implemented', evidence: ['sandbox-account-lifecycle'] },
  'identity:google': { version: '1.0.0', status: 'implemented', evidence: ['sandbox-account-lifecycle'] },
  'identity:email': { version: '0.2.0', status: 'contract-only' },
  'payment:toss': { version: '1.0.0', status: 'implemented', supports: ['one-time', 'credits'], evidence: ['sandbox-payment-refund'] },
  'payment:stripe': { version: '1.0.0', status: 'implemented', supports: ['one-time', 'credits', 'subscription', 'subscription-plus-credits'], evidence: ['sandbox-payment-refund-subscription'] },
  'database:d1': { version: '1.0.0', status: 'implemented', evidence: ['migration-race-recovery'] },
  'database:postgres-hyperdrive': { version: '1.0.0', status: 'implemented', evidence: ['external-postgres-migration-recovery'] },
});
