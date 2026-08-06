import type { Env } from '../../platform/env';
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
  const token = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error('OAuth token exchange failed: ' + JSON.stringify(token));
  if (typeof token.id_token !== 'string') {
    throw new Error('OIDC ID token missing; enable OpenID Connect for this provider');
  }
  return verifyOidcIdToken({
    idToken: token.id_token,
    discoveryUrl: provider.discoveryUrl,
    clientId: provider.clientId,
    nonce,
  });
}

async function upsertIdentity(env: Env, provider: IdentityProviderName, claims: Record<string, unknown>): Promise<string> {
  const subject = String(claims.sub);
  const email = typeof claims.email === 'string' ? claims.email : null;
  const displayName = typeof claims.name === 'string'
    ? claims.name
    : typeof claims.nickname === 'string'
      ? claims.nickname
      : null;
  const existing = await env.DB.prepare(
    'SELECT user_id FROM oauth_identity WHERE provider = ? AND subject = ?',
  ).bind(provider, subject).first<{ user_id: string }>();
  const timestamp = now();
  if (existing) {
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE oauth_identity SET email = ?, display_name = ?, updated_at = ? WHERE provider = ? AND subject = ?',
      ).bind(email, displayName, timestamp, provider, subject),
      env.DB.prepare(
        'UPDATE app_user SET email = COALESCE(?, email), display_name = COALESCE(?, display_name), updated_at = ? WHERE id = ?',
      ).bind(email, displayName, timestamp, existing.user_id),
    ]);
    return existing.user_id;
  }

  const userId = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO app_user(id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(userId, email, displayName, timestamp, timestamp),
      env.DB.prepare(
        'INSERT INTO oauth_identity(provider, subject, user_id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(provider, subject, userId, email, displayName, timestamp, timestamp),
      env.DB.prepare(
        'INSERT INTO credit_account(user_id, balance, updated_at) VALUES (?, 0, ?)',
      ).bind(userId, timestamp),
    ]);
    return userId;
  } catch (error) {
    const winner = await env.DB.prepare(
      'SELECT user_id FROM oauth_identity WHERE provider = ? AND subject = ?',
    ).bind(provider, subject).first<{ user_id: string }>();
    if (winner) return winner.user_id;
    throw error;
  }
}

async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken(32);
  const hash = await sha256Hex(token);
  const timestamp = now();
  await env.DB.prepare(
    'INSERT INTO app_session(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).bind(hash, userId, timestamp + sessionLifetime, timestamp).run();
  return token;
}

export async function completeLogin(
  env: Env,
  state: string,
  code: string,
): Promise<{ token: string; returnTo: string }> {
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
  ).bind(hash, now()).first<{
    id: string;
    email: string | null;
    display_name: string | null;
    role: SessionUser['role'];
  }>();
  if (!row) return null;
  const role = row.id === env.ADMIN_BOOTSTRAP_USER_ID ? 'admin' : row.role;
  return { id: row.id, email: row.email, displayName: row.display_name, role };
}

export async function revokeSession(env: Env, rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await env.DB.prepare('DELETE FROM app_session WHERE token_hash = ?')
    .bind(await sha256Hex(rawToken)).run();
}
