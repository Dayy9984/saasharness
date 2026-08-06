export const STARTER_VERSION = 'b2c-react-cloudflare@0.1.0';

export const MODULES = Object.freeze({
  identity: { version: '0.1.0', baseline: true },
  analytics: { version: '0.1.0', baseline: true },
  'admin-support': { version: '0.1.0', baseline: true },
  privacy: { version: '0.1.0', baseline: true },
  audit: { version: '0.1.0', baseline: true },
  observability: { version: '0.1.0', baseline: true },
  'release-support': { version: '0.1.0', baseline: true },
  order: { version: '0.1.0' },
  billing: { version: '0.1.0' },
  subscription: { version: '0.1.0' },
  entitlement: { version: '0.1.0' },
  credits: { version: '0.1.0' },
  jobs: { version: '0.1.0' },
  storage: { version: '0.1.0' },
  email: { version: '0.1.0' },
  realtime: { version: '0.1.0' },
});

export const ADAPTERS = Object.freeze({
  'identity:kakao': { version: '0.1.0', status: 'contract-only' },
  'identity:google': { version: '0.1.0', status: 'contract-only' },
  'identity:email': { version: '0.1.0', status: 'contract-only' },
  'payment:kr-unresolved': { version: '0.1.0', status: 'unresolved' },
  'payment:global-unresolved': { version: '0.1.0', status: 'unresolved' },
  'database:d1': { version: '0.1.0', status: 'starter' },
  'database:postgres-hyperdrive': { version: '0.1.0', status: 'starter' },
});
