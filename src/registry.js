export const STARTER_VERSION = 'b2c-react-cloudflare@0.3.0';

export const MODULES = Object.freeze({
  identity: { version: '0.3.0', baseline: true, status: 'sandbox-required' },
  analytics: { version: '0.1.0', baseline: true, status: 'contract-only' },
  'admin-support': { version: '0.3.0', baseline: true, status: 'generated-unvalidated' },
  privacy: { version: '0.3.0', baseline: true, status: 'generated-unvalidated' },
  audit: { version: '0.3.0', baseline: true, status: 'generated-unvalidated' },
  observability: { version: '0.2.0', baseline: true, status: 'generated-unvalidated' },
  'release-support': { version: '0.2.0', baseline: true, status: 'generated-unvalidated' },
  order: { version: '0.3.0', status: 'sandbox-required' },
  billing: { version: '0.3.0', status: 'sandbox-required' },
  subscription: { version: '0.3.0', status: 'partial' },
  entitlement: { version: '0.3.0', status: 'sandbox-required' },
  credits: { version: '0.3.0', status: 'database-validation-required' },
  jobs: { version: '0.1.0', status: 'contract-only' },
  storage: { version: '0.1.0', status: 'contract-only' },
  email: { version: '0.1.0', status: 'contract-only' },
  realtime: { version: '0.1.0', status: 'contract-only' },
});

export const ADAPTERS = Object.freeze({
  'identity:kakao': { version: '0.3.0', status: 'sandbox-required' },
  'identity:google': { version: '0.3.0', status: 'sandbox-required' },
  'identity:email': { version: '0.1.0', status: 'contract-only' },
  'payment:toss': { version: '0.3.0', status: 'sandbox-required' },
  'payment:stripe': { version: '0.3.0', status: 'sandbox-required' },
  'database:d1': { version: '0.3.0', status: 'local-validation-required' },
  'database:postgres-hyperdrive': { version: '0.1.0', status: 'contract-only' },
});
