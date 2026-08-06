const raw = String.raw;

function packageFile(plan) {
  return `${JSON.stringify({
    name: plan.product.name,
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc -b && vite build',
      preview: 'npm run build && vite preview',
      deploy: 'npm run build && wrangler deploy',
      check: 'tsc -b && vite build && wrangler deploy --dry-run',
      test: 'vitest run --config vitest.config.ts',
      'test:e2e': 'playwright test',
      'db:migrate:local': 'wrangler d1 migrations apply DB --local',
      'db:migrate:preview': 'wrangler d1 migrations apply DB --preview',
      'db:migrate:remote': 'wrangler d1 migrations apply DB --remote',
    },
    dependencies: {
      hono: '4.13.0',
      react: '19.2.1',
      'react-dom': '19.2.1',
    },
    devDependencies: {
      '@cloudflare/vite-plugin': '1.15.3',
      '@playwright/test': '1.59.1',
      '@types/node': '24.10.1',
      '@types/react': '19.2.7',
      '@types/react-dom': '19.2.3',
      '@vitejs/plugin-react': '5.1.1',
      typescript: '5.9.3',
      vite: '^7.0.0',
      vitest: '4.0.14',
      wrangler: '4.88.0',
    },
  }, null, 2)}\n`;
}

function wranglerFile(plan) {
  const d1 = plan.moduleLock.adapters.database.provider === 'd1';
  const db = {
    binding: 'DB',
    database_name: `${plan.product.name}-db`,
    database_id: '00000000-0000-0000-0000-000000000001',
    preview_database_id: 'DB',
    migrations_dir: 'migrations',
  };
  const config = {
    $schema: 'node_modules/wrangler/config-schema.json',
    name: plan.product.name,
    main: './src/worker/index.ts',
    compatibility_date: '2025-10-08',
    compatibility_flags: ['nodejs_compat'],
    observability: { enabled: true },
    upload_source_maps: true,
    assets: { directory: './dist/client', not_found_handling: 'single-page-application' },
    vars: { APP_ENV: 'local', APP_ORIGIN: 'http://localhost:5173', PAYMENT_PROVIDER: plan.product.region === 'kr' ? 'toss' : 'stripe' },
    ...(d1 ? { d1_databases: [db] } : {}),
    env: {
      preview: {
        name: `${plan.product.name}-preview`,
        vars: { APP_ENV: 'preview', APP_ORIGIN: 'https://preview.example.invalid', PAYMENT_PROVIDER: plan.product.region === 'kr' ? 'toss' : 'stripe' },
        ...(d1 ? { d1_databases: [{ ...db, database_id: '00000000-0000-0000-0000-000000000002' }] } : {}),
      },
      staging: {
        name: `${plan.product.name}-staging`,
        vars: { APP_ENV: 'staging', APP_ORIGIN: 'https://staging.example.invalid', PAYMENT_PROVIDER: plan.product.region === 'kr' ? 'toss' : 'stripe' },
        ...(d1 ? { d1_databases: [{ ...db, database_id: '00000000-0000-0000-0000-000000000003' }] } : {}),
      },
      production: {
        name: plan.product.name,
        vars: { APP_ENV: 'production', APP_ORIGIN: 'https://example.invalid', PAYMENT_PROVIDER: plan.product.region === 'kr' ? 'toss' : 'stripe' },
        ...(d1 ? { d1_databases: [{ ...db, database_id: '00000000-0000-0000-0000-000000000004' }] } : {}),
      },
    },
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function migrationFile() {
  return raw`PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_user (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'support', 'admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS oauth_attempt (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  nonce TEXT NOT NULL,
  return_to TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_identity (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE INDEX IF NOT EXISTS idx_oauth_identity_user ON oauth_identity(user_id);

CREATE TABLE IF NOT EXISTS app_session (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_user ON app_session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expiry ON app_session(expires_at);

CREATE TABLE IF NOT EXISTS plan_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  billing_mode TEXT NOT NULL CHECK (billing_mode IN ('one-time', 'subscription', 'credits')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  entitlement_key TEXT NOT NULL,
  credit_amount INTEGER NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  stripe_price_id TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_order (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id),
  plan_id TEXT NOT NULL REFERENCES plan_catalog(id),
  provider TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'paid', 'failed', 'canceled', 'refunded')),
  provider_payment_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_provider_payment ON app_order(provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_user ON app_order(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_record (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES app_order(id),
  provider TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_payment_id)
);

CREATE TABLE IF NOT EXISTS subscription_record (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id),
  plan_id TEXT NOT NULL REFERENCES plan_catalog(id),
  provider TEXT NOT NULL,
  provider_subscription_id TEXT,
  status TEXT NOT NULL,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_subscription_id)
);

CREATE TABLE IF NOT EXISTS entitlement (
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'grace', 'revoked')),
  expires_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, entitlement_key)
);

CREATE TABLE IF NOT EXISTS credit_account (
  user_id TEXT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES credit_account(user_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  actor_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS credit_ledger_no_update
BEFORE UPDATE ON credit_ledger BEGIN
  SELECT RAISE(ABORT, 'credit_ledger is append-only');
END;
CREATE TRIGGER IF NOT EXISTS credit_ledger_no_delete
BEFORE DELETE ON credit_ledger BEGIN
  SELECT RAISE(ABORT, 'credit_ledger is append-only');
END;

CREATE TABLE IF NOT EXISTS webhook_inbox (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  error TEXT,
  PRIMARY KEY (provider, event_id)
);

CREATE TABLE IF NOT EXISTS outbox_event (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  processed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox_event(status, available_at);

CREATE TABLE IF NOT EXISTS audit_event (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  subject_id TEXT,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit_event(subject_id, created_at DESC);
`;
}

export function platformFiles(plan) {
  const d1 = plan.moduleLock.adapters.database.provider === 'd1';
  const files = {
    'package.json': packageFile(plan),
    'wrangler.jsonc': wranglerFile(plan),
    '.dev.vars.example': raw`# Copy to .dev.vars. Never commit real values.
APP_ORIGIN=http://localhost:5173
APP_ENV=local

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

PAYMENT_PROVIDER=${plan.product.region === 'kr' ? 'toss' : 'stripe'}
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_API_VERSION=
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=

ADMIN_BOOTSTRAP_USER_ID=
`,
    'src/platform/env.ts': raw`export interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  meta?: { changes?: number };
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}

export interface Env {
  DB: D1DatabaseLike;
  APP_ENV: 'local' | 'preview' | 'staging' | 'production';
  APP_ORIGIN: string;
  PAYMENT_PROVIDER: 'stripe' | 'toss';
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  KAKAO_CLIENT_ID?: string;
  KAKAO_CLIENT_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_API_VERSION?: string;
  TOSS_CLIENT_KEY?: string;
  TOSS_SECRET_KEY?: string;
  ADMIN_BOOTSTRAP_USER_ID?: string;
}

export function requireEnv(env: Env, key: keyof Env): string {
  const value = env[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error('Missing environment binding: ' + String(key));
  return value;
}
`,
    'src/platform/crypto.ts': raw`function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function randomToken(size = 32): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
}

const discoveryCache = new Map<string, Promise<Discovery>>();
const jwksCache = new Map<string, Promise<{ keys: JsonWebKey[] }>>();

export function getDiscovery(url: string): Promise<Discovery> {
  if (!discoveryCache.has(url)) {
    discoveryCache.set(url, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error('OIDC discovery failed: ' + response.status);
      return response.json<Discovery>();
    }));
  }
  return discoveryCache.get(url)!;
}

async function getJwks(url: string): Promise<{ keys: JsonWebKey[] }> {
  if (!jwksCache.has(url)) {
    jwksCache.set(url, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error('OIDC JWKS failed: ' + response.status);
      return response.json<{ keys: JsonWebKey[] }>();
    }));
  }
  return jwksCache.get(url)!;
}

export async function verifyOidcIdToken(input: {
  idToken: string;
  discoveryUrl: string;
  clientId: string;
  nonce: string;
}): Promise<Record<string, unknown>> {
  const parts = input.idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid ID token format');
  const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]))) as { alg?: string; kid?: string };
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as Record<string, unknown>;
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported ID token algorithm');

  const discovery = await getDiscovery(input.discoveryUrl);
  const jwks = await getJwks(discovery.jwks_uri);
  const jwk = jwks.keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) throw new Error('ID token signing key not found');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1]),
  );
  if (!valid) throw new Error('Invalid ID token signature');

  const issuer = payload.iss;
  const audience = payload.aud;
  const expiry = payload.exp;
  if (issuer !== discovery.issuer && !(discovery.issuer === 'https://accounts.google.com' && issuer === 'accounts.google.com')) {
    throw new Error('Invalid ID token issuer');
  }
  const audienceMatches = Array.isArray(audience) ? audience.includes(input.clientId) : audience === input.clientId;
  if (!audienceMatches) throw new Error('Invalid ID token audience');
  if (typeof expiry !== 'number' || expiry <= Math.floor(Date.now() / 1000)) throw new Error('Expired ID token');
  if (payload.nonce !== input.nonce) throw new Error('Invalid ID token nonce');
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('ID token subject missing');
  return payload;
}
`,
    'src/modules/identity/providers.ts': raw`import type { Env } from '../../platform/env';
import { requireEnv } from '../../platform/env';

export type IdentityProviderName = 'google' | 'kakao';

export interface IdentityProviderConfig {
  name: IdentityProviderName;
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

export function identityProvider(env: Env, name: IdentityProviderName): IdentityProviderConfig {
  if (name === 'google') {
    return {
      name,
      discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
      clientId: requireEnv(env, 'GOOGLE_CLIENT_ID'),
      clientSecret: requireEnv(env, 'GOOGLE_CLIENT_SECRET'),
      scope: 'openid email profile',
    };
  }
  return {
    name,
    discoveryUrl: 'https://kauth.kakao.com/.well-known/openid-configuration',
    clientId: requireEnv(env, 'KAKAO_CLIENT_ID'),
    clientSecret: requireEnv(env, 'KAKAO_CLIENT_SECRET'),
    scope: 'openid account_email profile',
  };
}

export function isIdentityProvider(value: string): value is IdentityProviderName {
  return value === 'google' || value === 'kakao';
}
`,
    'src/modules/identity/service.ts': raw`import type { Env } from '../../platform/env';
import { getDiscovery, randomToken, sha256Hex, verifyOidcIdToken } from '../../platform/crypto';
import { identityProvider, type IdentityProviderName } from './providers';

interface OAuthAttempt {
  provider: IdentityProviderName;
  nonce: string;
  return_to: string;
}

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: 'user' | 'support' | 'admin';
}

const now = () => Date.now();
const sessionLifetime = 30 * 24 * 60 * 60 * 1000;

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export async function beginLogin(env: Env, providerName: IdentityProviderName, returnTo: string | null): Promise<string> {
  const provider = identityProvider(env, providerName);
  const discovery = await getDiscovery(provider.discoveryUrl);
  const state = randomToken(32);
  const nonce = randomToken(32);
  const timestamp = now();
  await env.DB.prepare(
    'INSERT INTO oauth_attempt(state, provider, nonce, return_to, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(state, providerName, nonce, safeReturnTo(returnTo), timestamp + 10 * 60 * 1000, timestamp).run();

  const callback = env.APP_ORIGIN + '/api/auth/' + providerName + '/callback';
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', provider.clientId);
  url.searchParams.set('redirect_uri', callback);
  url.searchParams.set('scope', provider.scope);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  return url.toString();
}

async function consumeAttempt(env: Env, state: string): Promise<OAuthAttempt> {
  const attempt = await env.DB.prepare(
    'DELETE FROM oauth_attempt WHERE state = ? AND expires_at > ? RETURNING provider, nonce, return_to',
  ).bind(state, now()).first<OAuthAttempt>();
  if (!attempt) throw new Error('OAuth state is missing, expired, or already used');
  return attempt;
}

async function exchangeCode(env: Env, providerName: IdentityProviderName, code: string, nonce: string) {
  const provider = identityProvider(env, providerName);
  const discovery = await getDiscovery(provider.discoveryUrl);
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    redirect_uri: env.APP_ORIGIN + '/api/auth/' + providerName + '/callback',
  });
  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const token = await response.json<Record<string, unknown>>();
  if (!response.ok) throw new Error('OAuth token exchange failed: ' + JSON.stringify(token));
  if (typeof token.id_token !== 'string') throw new Error('OIDC ID token missing; enable OpenID Connect for this provider');
  const claims = await verifyOidcIdToken({ idToken: token.id_token, discoveryUrl: provider.discoveryUrl, clientId: provider.clientId, nonce });
  return claims;
}

async function upsertIdentity(env: Env, provider: IdentityProviderName, claims: Record<string, unknown>): Promise<string> {
  const subject = String(claims.sub);
  const email = typeof claims.email === 'string' ? claims.email : null;
  const displayName = typeof claims.name === 'string' ? claims.name : typeof claims.nickname === 'string' ? claims.nickname : null;
  const existing = await env.DB.prepare(
    'SELECT user_id FROM oauth_identity WHERE provider = ? AND subject = ?',
  ).bind(provider, subject).first<{ user_id: string }>();
  const timestamp = now();
  if (existing) {
    await env.DB.batch([
      env.DB.prepare('UPDATE oauth_identity SET email = ?, display_name = ?, updated_at = ? WHERE provider = ? AND subject = ?')
        .bind(email, displayName, timestamp, provider, subject),
      env.DB.prepare('UPDATE app_user SET email = COALESCE(?, email), display_name = COALESCE(?, display_name), updated_at = ? WHERE id = ?')
        .bind(email, displayName, timestamp, existing.user_id),
    ]);
    return existing.user_id;
  }

  const userId = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO app_user(id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, email, displayName, timestamp, timestamp),
      env.DB.prepare('INSERT INTO oauth_identity(provider, subject, user_id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(provider, subject, userId, email, displayName, timestamp, timestamp),
      env.DB.prepare('INSERT INTO credit_account(user_id, balance, updated_at) VALUES (?, 0, ?)')
        .bind(userId, timestamp),
    ]);
    return userId;
  } catch (error) {
    const winner = await env.DB.prepare('SELECT user_id FROM oauth_identity WHERE provider = ? AND subject = ?')
      .bind(provider, subject).first<{ user_id: string }>();
    if (winner) return winner.user_id;
    throw error;
  }
}

async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken(32);
  const hash = await sha256Hex(token);
  const timestamp = now();
  await env.DB.prepare('INSERT INTO app_session(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(hash, userId, timestamp + sessionLifetime, timestamp).run();
  return token;
}

export async function completeLogin(env: Env, state: string, code: string): Promise<{ token: string; returnTo: string }> {
  const attempt = await consumeAttempt(env, state);
  const claims = await exchangeCode(env, attempt.provider, code, attempt.nonce);
  const userId = await upsertIdentity(env, attempt.provider, claims);
  return { token: await createSession(env, userId), returnTo: attempt.return_to };
}

export async function getSessionUser(env: Env, rawToken: string | undefined): Promise<SessionUser | null> {
  if (!rawToken) return null;
  const hash = await sha256Hex(rawToken);
  const row = await env.DB.prepare(
    'SELECT u.id, u.email, u.display_name, u.role FROM app_session s JOIN app_user u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.deleted_at IS NULL',
  ).bind(hash, now()).first<{ id: string; email: string | null; display_name: string | null; role: SessionUser['role'] }>();
  return row ? { id: row.id, email: row.email, displayName: row.display_name, role: row.role } : null;
}

export async function revokeSession(env: Env, rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await env.DB.prepare('DELETE FROM app_session WHERE token_hash = ?').bind(await sha256Hex(rawToken)).run();
}
`,
    'src/modules/identity/routes.ts': raw`import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../../platform/env';
import { beginLogin, completeLogin, getSessionUser, revokeSession } from './service';
import { isIdentityProvider } from './providers';

const cookieName = (env: Env) => env.APP_ENV === 'local' ? 'app_session' : '__Host-app_session';
const cookieOptions = (env: Env) => ({ httpOnly: true, secure: env.APP_ENV !== 'local', sameSite: 'Lax' as const, path: '/', maxAge: 30 * 24 * 60 * 60 });

export const identityRoutes = new Hono<{ Bindings: Env }>();

identityRoutes.get('/api/auth/:provider/start', async (context) => {
  const provider = context.req.param('provider');
  if (!isIdentityProvider(provider)) return context.json({ error: 'unsupported identity provider' }, 400);
  return context.redirect(await beginLogin(context.env, provider, context.req.query('returnTo') ?? null));
});

identityRoutes.get('/api/auth/:provider/callback', async (context) => {
  const provider = context.req.param('provider');
  if (!isIdentityProvider(provider)) return context.json({ error: 'unsupported identity provider' }, 400);
  const state = context.req.query('state');
  const code = context.req.query('code');
  if (!state || !code) return context.json({ error: 'state and code are required' }, 400);
  const result = await completeLogin(context.env, state, code);
  setCookie(context, cookieName(context.env), result.token, cookieOptions(context.env));
  return context.redirect(new URL(result.returnTo, context.env.APP_ORIGIN).toString());
});

identityRoutes.get('/api/auth/session', async (context) => {
  const user = await getSessionUser(context.env, getCookie(context, cookieName(context.env)));
  return context.json({ authenticated: Boolean(user), user });
});

identityRoutes.post('/api/auth/logout', async (context) => {
  const token = getCookie(context, cookieName(context.env));
  await revokeSession(context.env, token);
  deleteCookie(context, cookieName(context.env), { path: '/' });
  return context.json({ ok: true });
});

export async function requireUser(context: Parameters<Parameters<typeof identityRoutes.get>[1]>[0]) {
  const user = await getSessionUser(context.env, getCookie(context, cookieName(context.env)));
  return user;
}
`,
    'src/modules/identity/public.ts': raw`export { identityRoutes, requireUser } from './routes';
export { getSessionUser, type SessionUser } from './service';
`,
    'src/modules/credits/service.ts': raw`import type { Env } from '../../platform/env';

export interface CreditMutation {
  userId: string;
  amount: number;
  reason: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  actorId?: string | null;
}

function validate(input: CreditMutation) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error('credit amount must be a positive integer');
  if (!input.idempotencyKey) throw new Error('idempotencyKey is required');
}

async function replay(env: Env, key: string, input: CreditMutation, delta: number) {
  const existing = await env.DB.prepare(
    'SELECT user_id, delta, reason, reference_type, reference_id FROM credit_ledger WHERE idempotency_key = ?',
  ).bind(key).first<{ user_id: string; delta: number; reason: string; reference_type: string; reference_id: string }>();
  if (!existing) return null;
  const same = existing.user_id === input.userId && existing.delta === delta && existing.reason === input.reason && existing.reference_type === input.referenceType && existing.reference_id === input.referenceId;
  if (!same) throw new Error('idempotency key reused for a different credit operation');
  return getCreditBalance(env, input.userId);
}

async function mutate(env: Env, input: CreditMutation, delta: number): Promise<{ balance: number; replayed: boolean }> {
  validate(input);
  const previous = await replay(env, input.idempotencyKey, input, delta);
  if (previous !== null) return { balance: previous, replayed: true };
  const timestamp = Date.now();
  const ledgerId = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO credit_ledger(id, user_id, delta, reason, reference_type, reference_id, idempotency_key, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(ledgerId, input.userId, delta, input.reason, input.referenceType, input.referenceId, input.idempotencyKey, input.actorId ?? null, timestamp),
      env.DB.prepare('UPDATE credit_account SET balance = balance + ?, updated_at = ? WHERE user_id = ?')
        .bind(delta, timestamp, input.userId),
      env.DB.prepare('INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), input.actorId ?? input.userId, input.userId, delta > 0 ? 'credits.grant' : 'credits.spend', JSON.stringify({ delta, reason: input.reason, referenceType: input.referenceType, referenceId: input.referenceId }), timestamp),
    ]);
  } catch (error) {
    const afterFailure = await replay(env, input.idempotencyKey, input, delta);
    if (afterFailure !== null) return { balance: afterFailure, replayed: true };
    if (delta < 0) throw new Error('credit spend failed: insufficient balance, missing account, or concurrent conflict');
    throw error;
  }
  return { balance: await getCreditBalance(env, input.userId), replayed: false };
}

export async function getCreditBalance(env: Env, userId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT balance FROM credit_account WHERE user_id = ?').bind(userId).first<{ balance: number }>();
  if (!row) throw new Error('credit account not found');
  return row.balance;
}

export const grantCredits = (env: Env, input: CreditMutation) => mutate(env, input, input.amount);
export const spendCredits = (env: Env, input: CreditMutation) => mutate(env, input, -input.amount);
export const refundCredits = (env: Env, input: CreditMutation) => mutate(env, { ...input, reason: input.reason || 'refund' }, input.amount);
`,
    'src/modules/credits/public.ts': raw`export { getCreditBalance, grantCredits, spendCredits, refundCredits, type CreditMutation } from './service';
`,
    'src/modules/billing/adapters.ts': raw`import type { Env } from '../../platform/env';
import { requireEnv } from '../../platform/env';
import { constantTimeEqual, hmacSha256Hex } from '../../platform/crypto';

export interface CatalogPlan {
  id: string;
  name: string;
  billing_mode: 'one-time' | 'subscription' | 'credits';
  amount_minor: number;
  currency: string;
  entitlement_key: string;
  credit_amount: number;
  stripe_price_id: string | null;
}

export interface CheckoutInput {
  orderId: string;
  userId: string;
  plan: CatalogPlan;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export async function createStripeCheckout(env: Env, input: CheckoutInput) {
  const form = new URLSearchParams();
  form.set('mode', input.plan.billing_mode === 'subscription' ? 'subscription' : 'payment');
  form.set('success_url', input.successUrl + '?session_id={CHECKOUT_SESSION_ID}');
  form.set('cancel_url', input.cancelUrl);
  form.set('client_reference_id', input.orderId);
  form.set('metadata[order_id]', input.orderId);
  form.set('metadata[user_id]', input.userId);
  if (input.plan.stripe_price_id) {
    form.set('line_items[0][price]', input.plan.stripe_price_id);
  } else {
    form.set('line_items[0][price_data][currency]', input.plan.currency.toLowerCase());
    form.set('line_items[0][price_data][unit_amount]', String(input.plan.amount_minor));
    form.set('line_items[0][price_data][product_data][name]', input.plan.name);
  }
  form.set('line_items[0][quantity]', '1');
  const headers: Record<string, string> = {
    authorization: 'Bearer ' + requireEnv(env, 'STRIPE_SECRET_KEY'),
    'content-type': 'application/x-www-form-urlencoded',
    'idempotency-key': input.idempotencyKey,
  };
  if (env.STRIPE_API_VERSION) headers['stripe-version'] = env.STRIPE_API_VERSION;
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers, body: form });
  const body = await response.json<Record<string, unknown>>();
  if (!response.ok) throw new Error('Stripe Checkout failed: ' + JSON.stringify(body));
  return { provider: 'stripe' as const, id: String(body.id), url: String(body.url) };
}

export async function verifyStripeWebhook(env: Env, rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) throw new Error('Stripe-Signature header missing');
  const values = Object.fromEntries(signatureHeader.split(',').map((part) => part.split('=', 2) as [string, string]));
  const timestamp = values.t;
  const signature = values.v1;
  if (!timestamp || !signature) throw new Error('Malformed Stripe signature');
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) throw new Error('Stripe signature timestamp outside tolerance');
  const expected = await hmacSha256Hex(requireEnv(env, 'STRIPE_WEBHOOK_SECRET'), timestamp + '.' + rawBody);
  if (!constantTimeEqual(expected, signature)) throw new Error('Invalid Stripe signature');
  return JSON.parse(rawBody) as Record<string, unknown>;
}

function basic(secret: string) {
  return 'Basic ' + btoa(secret + ':');
}

export async function confirmTossPayment(env: Env, input: { paymentKey: string; orderId: string; amount: number; idempotencyKey: string }) {
  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      authorization: basic(requireEnv(env, 'TOSS_SECRET_KEY')),
      'content-type': 'application/json',
      'idempotency-key': input.idempotencyKey,
    },
    body: JSON.stringify({ paymentKey: input.paymentKey, orderId: input.orderId, amount: input.amount }),
  });
  const body = await response.json<Record<string, unknown>>();
  if (!response.ok) throw new Error('Toss payment confirmation failed: ' + JSON.stringify(body));
  return body;
}

export async function retrieveTossPayment(env: Env, paymentKey: string) {
  const response = await fetch('https://api.tosspayments.com/v1/payments/' + encodeURIComponent(paymentKey), {
    headers: { authorization: basic(requireEnv(env, 'TOSS_SECRET_KEY')) },
  });
  const body = await response.json<Record<string, unknown>>();
  if (!response.ok) throw new Error('Toss payment query failed: ' + JSON.stringify(body));
  return body;
}
`,
    'src/modules/billing/service.ts': raw`import type { Env } from '../../platform/env';
import { requireEnv } from '../../platform/env';
import { grantCredits } from '../credits/public';
import { createStripeCheckout, confirmTossPayment, retrieveTossPayment, verifyStripeWebhook, type CatalogPlan } from './adapters';

interface OrderRow {
  id: string;
  user_id: string;
  plan_id: string;
  provider: string;
  amount_minor: number;
  currency: string;
  status: string;
}

async function catalogPlan(env: Env, planId: string): Promise<CatalogPlan> {
  const plan = await env.DB.prepare('SELECT id, name, billing_mode, amount_minor, currency, entitlement_key, credit_amount, stripe_price_id FROM plan_catalog WHERE id = ? AND active = 1')
    .bind(planId).first<CatalogPlan>();
  if (!plan) throw new Error('plan not found or inactive');
  return plan;
}

async function createOrder(env: Env, userId: string, plan: CatalogPlan, provider: string): Promise<OrderRow> {
  const order: OrderRow = {
    id: 'ord_' + crypto.randomUUID().replace(/-/g, ''),
    user_id: userId,
    plan_id: plan.id,
    provider,
    amount_minor: plan.amount_minor,
    currency: plan.currency,
    status: 'created',
  };
  const timestamp = Date.now();
  await env.DB.prepare('INSERT INTO app_order(id, user_id, plan_id, provider, amount_minor, currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(order.id, order.user_id, order.plan_id, provider, order.amount_minor, order.currency, order.status, timestamp, timestamp).run();
  return order;
}

export async function beginCheckout(env: Env, userId: string, planId: string) {
  const plan = await catalogPlan(env, planId);
  const provider = env.PAYMENT_PROVIDER;
  const order = await createOrder(env, userId, plan, provider);
  const idempotencyKey = 'checkout:' + order.id;
  if (provider === 'stripe') {
    const session = await createStripeCheckout(env, {
      orderId: order.id,
      userId,
      plan,
      successUrl: env.APP_ORIGIN + '/billing/success',
      cancelUrl: env.APP_ORIGIN + '/billing/cancel',
      idempotencyKey,
    });
    await env.DB.prepare('UPDATE app_order SET status = ?, provider_payment_id = ?, updated_at = ? WHERE id = ?')
      .bind('pending', session.id, Date.now(), order.id).run();
    return { provider, orderId: order.id, checkoutUrl: session.url };
  }
  return {
    provider,
    orderId: order.id,
    amount: order.amount_minor,
    currency: order.currency,
    orderName: plan.name,
    clientKey: requireEnv(env, 'TOSS_CLIENT_KEY'),
    successUrl: env.APP_ORIGIN + '/billing/toss/success',
    failUrl: env.APP_ORIGIN + '/billing/toss/fail',
  };
}

async function claimWebhook(env: Env, provider: string, eventId: string, eventType: string, payload: unknown): Promise<boolean> {
  const existing = await env.DB.prepare('SELECT processed_at FROM webhook_inbox WHERE provider = ? AND event_id = ?')
    .bind(provider, eventId).first<{ processed_at: number | null }>();
  if (existing?.processed_at) return false;
  if (!existing) {
    try {
      await env.DB.prepare('INSERT INTO webhook_inbox(provider, event_id, event_type, payload_json, received_at) VALUES (?, ?, ?, ?, ?)')
        .bind(provider, eventId, eventType, JSON.stringify(payload), Date.now()).run();
    } catch {
      const raced = await env.DB.prepare('SELECT processed_at FROM webhook_inbox WHERE provider = ? AND event_id = ?')
        .bind(provider, eventId).first<{ processed_at: number | null }>();
      if (raced?.processed_at) return false;
    }
  }
  return true;
}

async function applyPaidOrder(env: Env, orderId: string, providerPaymentId: string, payload: Record<string, unknown>) {
  const order = await env.DB.prepare('SELECT id, user_id, plan_id, provider, amount_minor, currency, status FROM app_order WHERE id = ?')
    .bind(orderId).first<OrderRow>();
  if (!order) throw new Error('order not found');
  const plan = await catalogPlan(env, order.plan_id);
  const timestamp = Date.now();
  await env.DB.batch([
    env.DB.prepare('UPDATE app_order SET status = ?, provider_payment_id = ?, updated_at = ? WHERE id = ?')
      .bind('paid', providerPaymentId, timestamp, order.id),
    env.DB.prepare('INSERT INTO payment_record(id, order_id, provider, provider_payment_id, status, amount_minor, currency, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(provider, provider_payment_id) DO UPDATE SET status = excluded.status, payload_json = excluded.payload_json, updated_at = excluded.updated_at')
      .bind(crypto.randomUUID(), order.id, order.provider, providerPaymentId, 'paid', order.amount_minor, order.currency, JSON.stringify(payload), timestamp, timestamp),
    env.DB.prepare('INSERT INTO entitlement(user_id, entitlement_key, source_type, source_id, status, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, entitlement_key) DO UPDATE SET source_type = excluded.source_type, source_id = excluded.source_id, status = excluded.status, updated_at = excluded.updated_at')
      .bind(order.user_id, plan.entitlement_key, 'order', order.id, 'active', timestamp),
    env.DB.prepare('INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), order.user_id, order.user_id, 'billing.paid', JSON.stringify({ orderId: order.id, providerPaymentId }), timestamp),
  ]);
  if (plan.credit_amount > 0) {
    await grantCredits(env, {
      userId: order.user_id,
      amount: plan.credit_amount,
      reason: 'purchase',
      referenceType: 'order',
      referenceId: order.id,
      idempotencyKey: 'order-credits:' + order.id,
      actorId: order.user_id,
    });
  }
}

export async function finishTossCheckout(env: Env, userId: string, input: { paymentKey: string; orderId: string; amount: number }) {
  const order = await env.DB.prepare('SELECT id, user_id, plan_id, provider, amount_minor, currency, status FROM app_order WHERE id = ? AND user_id = ?')
    .bind(input.orderId, userId).first<OrderRow>();
  if (!order || order.provider !== 'toss') throw new Error('Toss order not found');
  if (order.amount_minor !== input.amount) throw new Error('payment amount does not match server order');
  const payment = await confirmTossPayment(env, { ...input, idempotencyKey: 'toss-confirm:' + order.id });
  if (payment.status !== 'DONE') throw new Error('Toss payment is not DONE');
  await applyPaidOrder(env, order.id, String(payment.paymentKey), payment);
  return { orderId: order.id, status: 'paid' };
}

export async function handleStripeWebhook(env: Env, rawBody: string, signature: string | null) {
  const event = await verifyStripeWebhook(env, rawBody, signature);
  const eventId = String(event.id);
  const eventType = String(event.type);
  if (!await claimWebhook(env, 'stripe', eventId, eventType, event)) return { duplicate: true };
  const object = (event.data as { object?: Record<string, unknown> } | undefined)?.object ?? {};
  if (eventType === 'checkout.session.completed' && object.payment_status === 'paid') {
    const metadata = object.metadata as Record<string, unknown> | undefined;
    const orderId = metadata?.order_id ?? object.client_reference_id;
    if (typeof orderId !== 'string') throw new Error('Stripe order metadata missing');
    await applyPaidOrder(env, orderId, String(object.id), object);
  }
  await env.DB.prepare('UPDATE webhook_inbox SET processed_at = ?, error = NULL WHERE provider = ? AND event_id = ?')
    .bind(Date.now(), 'stripe', eventId).run();
  return { duplicate: false };
}

export async function handleTossWebhook(env: Env, transmissionId: string | null, payload: Record<string, unknown>) {
  const data = (payload.data as Record<string, unknown> | undefined) ?? payload;
  const paymentKey = data.paymentKey;
  if (typeof paymentKey !== 'string') throw new Error('Toss webhook paymentKey missing');
  const eventId = transmissionId ?? 'payment:' + paymentKey + ':' + String(payload.createdAt ?? data.status ?? 'unknown');
  const eventType = String(payload.eventType ?? 'PAYMENT_STATUS_CHANGED');
  if (!await claimWebhook(env, 'toss', eventId, eventType, payload)) return { duplicate: true };
  const verified = await retrieveTossPayment(env, paymentKey);
  if (verified.status === 'DONE') {
    await applyPaidOrder(env, String(verified.orderId), paymentKey, verified);
  }
  await env.DB.prepare('UPDATE webhook_inbox SET processed_at = ?, error = NULL WHERE provider = ? AND event_id = ?')
    .bind(Date.now(), 'toss', eventId).run();
  return { duplicate: false };
}
`,
    'src/modules/billing/routes.ts': raw`import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireUser } from '../identity/public';
import { beginCheckout, finishTossCheckout, handleStripeWebhook, handleTossWebhook } from './service';

export const billingRoutes = new Hono<{ Bindings: Env }>();

billingRoutes.post('/api/billing/checkout', async (context) => {
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{ planId?: string }>();
  if (!body.planId) return context.json({ error: 'planId is required' }, 400);
  return context.json(await beginCheckout(context.env, user.id, body.planId));
});

billingRoutes.post('/api/billing/toss/confirm', async (context) => {
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{ paymentKey?: string; orderId?: string; amount?: number }>();
  if (!body.paymentKey || !body.orderId || !Number.isSafeInteger(body.amount)) return context.json({ error: 'paymentKey, orderId, and integer amount are required' }, 400);
  return context.json(await finishTossCheckout(context.env, user.id, { paymentKey: body.paymentKey, orderId: body.orderId, amount: body.amount! }));
});

billingRoutes.post('/api/billing/webhooks/stripe', async (context) => {
  const rawBody = await context.req.text();
  return context.json(await handleStripeWebhook(context.env, rawBody, context.req.header('stripe-signature') ?? null));
});

billingRoutes.post('/api/billing/webhooks/toss', async (context) => {
  const payload = await context.req.json<Record<string, unknown>>();
  return context.json(await handleTossWebhook(context.env, context.req.header('tosspayments-webhook-transmission-id') ?? null, payload));
});
`,
    'src/modules/billing/public.ts': raw`export { billingRoutes } from './routes';
export { beginCheckout, finishTossCheckout, handleStripeWebhook, handleTossWebhook } from './service';
`,
    'src/modules/admin/routes.ts': raw`import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireUser } from '../identity/public';
import { grantCredits } from '../credits/public';

export const adminRoutes = new Hono<{ Bindings: Env }>();

async function requireAdmin(context: Parameters<Parameters<typeof adminRoutes.get>[1]>[0]) {
  const user = await requireUser(context);
  if (!user || (user.role !== 'admin' && user.role !== 'support')) return null;
  return user;
}

adminRoutes.get('/api/admin/users/:id', async (context) => {
  const actor = await requireAdmin(context);
  if (!actor) return context.json({ error: 'admin or support role required' }, 403);
  const userId = context.req.param('id');
  const user = await context.env.DB.prepare('SELECT id, email, display_name, role, created_at, updated_at, deleted_at FROM app_user WHERE id = ?').bind(userId).first();
  if (!user) return context.json({ error: 'user not found' }, 404);
  const [identities, orders, entitlements, ledger, audit] = await Promise.all([
    context.env.DB.prepare('SELECT provider, subject, email, display_name, created_at FROM oauth_identity WHERE user_id = ?').bind(userId).all(),
    context.env.DB.prepare('SELECT id, plan_id, provider, amount_minor, currency, status, created_at FROM app_order WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(userId).all(),
    context.env.DB.prepare('SELECT entitlement_key, source_type, source_id, status, expires_at, updated_at FROM entitlement WHERE user_id = ?').bind(userId).all(),
    context.env.DB.prepare('SELECT id, delta, reason, reference_type, reference_id, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(userId).all(),
    context.env.DB.prepare('SELECT actor_id, action, payload_json, created_at FROM audit_event WHERE subject_id = ? ORDER BY created_at DESC LIMIT 100').bind(userId).all(),
  ]);
  const balance = await context.env.DB.prepare('SELECT balance FROM credit_account WHERE user_id = ?').bind(userId).first();
  return context.json({ user, balance, identities: identities.results ?? [], orders: orders.results ?? [], entitlements: entitlements.results ?? [], ledger: ledger.results ?? [], audit: audit.results ?? [] });
});

adminRoutes.post('/api/admin/credits/adjust', async (context) => {
  const actor = await requireAdmin(context);
  if (!actor || actor.role !== 'admin') return context.json({ error: 'admin role required' }, 403);
  const body = await context.req.json<{ userId?: string; amount?: number; reason?: string; idempotencyKey?: string }>();
  if (!body.userId || !Number.isSafeInteger(body.amount) || body.amount! <= 0 || !body.reason || !body.idempotencyKey) {
    return context.json({ error: 'userId, positive integer amount, reason, and idempotencyKey are required' }, 400);
  }
  return context.json(await grantCredits(context.env, {
    userId: body.userId,
    amount: body.amount!,
    reason: body.reason,
    referenceType: 'admin-adjustment',
    referenceId: body.idempotencyKey,
    idempotencyKey: body.idempotencyKey,
    actorId: actor.id,
  }));
});
`,
    'src/modules/admin/public.ts': raw`export { adminRoutes } from './routes';
`,
    'src/modules/privacy/routes.ts': raw`import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireUser } from '../identity/public';

export const privacyRoutes = new Hono<{ Bindings: Env }>();

privacyRoutes.get('/api/account/export', async (context) => {
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const [identities, orders, entitlements, ledger] = await Promise.all([
    context.env.DB.prepare('SELECT provider, subject, email, display_name, created_at FROM oauth_identity WHERE user_id = ?').bind(user.id).all(),
    context.env.DB.prepare('SELECT id, plan_id, provider, amount_minor, currency, status, created_at FROM app_order WHERE user_id = ? ORDER BY created_at').bind(user.id).all(),
    context.env.DB.prepare('SELECT entitlement_key, source_type, source_id, status, expires_at, updated_at FROM entitlement WHERE user_id = ?').bind(user.id).all(),
    context.env.DB.prepare('SELECT id, delta, reason, reference_type, reference_id, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at').bind(user.id).all(),
  ]);
  return context.json({ user, identities: identities.results ?? [], orders: orders.results ?? [], entitlements: entitlements.results ?? [], creditLedger: ledger.results ?? [] });
});

privacyRoutes.post('/api/account/delete', async (context) => {
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const timestamp = Date.now();
  await context.env.DB.batch([
    context.env.DB.prepare('DELETE FROM app_session WHERE user_id = ?').bind(user.id),
    context.env.DB.prepare('DELETE FROM oauth_identity WHERE user_id = ?').bind(user.id),
    context.env.DB.prepare('UPDATE app_user SET email = NULL, display_name = NULL, deleted_at = ?, updated_at = ? WHERE id = ?').bind(timestamp, timestamp, user.id),
    context.env.DB.prepare('INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), user.id, user.id, 'privacy.account_deleted', '{}', timestamp),
  ]);
  return context.json({ ok: true, providerUnlinkRequired: true });
});
`,
    'src/modules/privacy/public.ts': raw`export { privacyRoutes } from './routes';
`,
    'src/worker/index.ts': raw`import { Hono } from 'hono';
import type { Env } from '../platform/env';
import { runtimeConfig } from '../generated/runtime-config';
import { identityRoutes } from '../modules/identity/public';
import { billingRoutes } from '../modules/billing/public';
import { adminRoutes } from '../modules/admin/public';
import { privacyRoutes } from '../modules/privacy/public';

const app = new Hono<{ Bindings: Env }>();
app.onError((error, context) => {
  console.error(JSON.stringify({ type: 'request_error', message: error.message, path: context.req.path }));
  return context.json({ error: 'request failed' }, 500);
});
app.get('/api/health', (context) => context.json({ ok: true, profileHash: runtimeConfig.profileHash, productionReady: runtimeConfig.productionReady }));
app.route('/', identityRoutes);
app.route('/', billingRoutes);
app.route('/', adminRoutes);
app.route('/', privacyRoutes);
export default app;
`,
    'src/react/admin/AdminPage.tsx': raw`import { useState } from 'react';

export function AdminPage() {
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  async function lookup() {
    setError(null);
    const response = await fetch('/api/admin/users/' + encodeURIComponent(userId));
    const body = await response.json();
    if (!response.ok) setError(body.error ?? 'Request failed');
    else setResult(body);
  }
  return (
    <main className="shell">
      <p className="eyebrow">Admin and support console scaffold</p>
      <h1>User timeline</h1>
      <label>User ID <input value={userId} onChange={(event) => setUserId(event.target.value)} /></label>
      <button type="button" onClick={lookup}>Look up user</button>
      {error && <p role="alert">{error}</p>}
      {result !== null && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
`,
    'src/react/main.tsx': raw`import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UxLab } from './ux-lab/UxLab';
import { AdminPage } from './admin/AdminPage';
import './styles.css';

const path = window.location.pathname;
const component = path.startsWith('/__ux') ? <UxLab /> : path.startsWith('/__admin') ? <AdminPage /> : <App />;
createRoot(document.getElementById('root')!).render(<StrictMode>{component}</StrictMode>);
`,
    'playwright.config.ts': raw`import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'html',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173/api/health', reuseExistingServer: !process.env.CI, timeout: 120000 },
});
`,
    'e2e/ux-lab.spec.ts': raw`import { test, expect } from '@playwright/test';

test('React UX Lab exposes critical mock states', async ({ page }) => {
  await page.goto('/__ux');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const state of ['loading', 'empty', 'error', 'paidLimit']) {
    await page.getByRole('button', { name: state }).click();
    await expect(page.locator('[data-state]')).toBeVisible();
  }
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});
`,
    '.github/workflows/ci.yml': raw`name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm audit --omit=dev --audit-level=high
      - run: npm run check
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
`,
    '.github/workflows/deploy.yml': raw`name: deploy
on:
  pull_request:
  workflow_dispatch:
    inputs:
      target:
        description: staging or production
        required: true
        default: staging
jobs:
  preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    environment: preview
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install
      - run: npm run check
      - run: npx wrangler versions upload --env preview
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  promote:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    environment: \${{ inputs.target }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install
      - run: npm run check
      - run: npx wrangler d1 migrations apply DB --remote --env \${{ inputs.target }}
        if: inputs.target == 'staging' || inputs.target == 'production'
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - run: npx wrangler versions upload --env staging
        if: inputs.target == 'staging'
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - run: npx wrangler deploy --env production
        if: inputs.target == 'production'
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
`,
    'docs/provider-setup.md': raw`# Provider Setup

## Identity

The generated identity module uses server-side OpenID Connect authorization-code flow, anti-forgery state, nonce, ID-token signature/issuer/audience/expiry validation, hashed server sessions, and provider-subject account keys.

- Google: create OAuth credentials, register `/api/auth/google/callback`, and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- Kakao: enable Kakao Login and OpenID Connect, register `/api/auth/kakao/callback`, enable the client secret, and set `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET`.

## Payment

- Global default: Stripe Checkout. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- KR default: Toss Payments. Configure `TOSS_CLIENT_KEY` and `TOSS_SECRET_KEY`.
- Payment and entitlement state is written through the billing module only.
- Stripe webhooks are HMAC-verified.
- General Toss payment webhooks are re-verified through the Payment Query API; the transmission ID is used for inbox de-duplication.
- All POST provider calls use stable idempotency keys.

## Database

Replace the placeholder D1 database IDs in `wrangler.jsonc`. Apply migrations locally, then in preview/staging/production through the release workflow.
`,
  };

  if (d1) files['migrations/0001_platform.sql'] = migrationFile();
  else files['docs/postgres-platform.md'] = raw`# PostgreSQL + Hyperdrive Platform

The generated operational modules currently target the D1 structural interface. Before production, implement the PostgreSQL adapter with real transactions, row locking, migrations, connection limits, and recovery tests. Production remains blocked until this adapter is hardened.
`;

  return files;
}
