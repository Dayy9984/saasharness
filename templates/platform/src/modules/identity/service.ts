import type { Env } from '../../platform/env';
import { database, isUniqueViolation } from '../../platform/database';
import {
  getDiscovery,
  randomToken,
  sha256Base64Url,
  sha256Hex,
  verifyOidcIdToken,
} from '../../platform/crypto';
import { identityProvider, type IdentityProviderName } from './providers';

interface OAuthAttempt {
  provider: IdentityProviderName;
  nonce: string;
  code_verifier: string;
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
  const codeVerifier = randomToken(48);
  const timestamp = now();
  const db = database(env);
  await db.run(
    'INSERT INTO oauth_attempt(state, provider, nonce, code_verifier, return_to, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [state, providerName, nonce, codeVerifier, safeReturnTo(returnTo), timestamp + 10 * 60 * 1000, timestamp],
  );

  const callback = env.APP_ORIGIN + '/api/auth/' + providerName + '/callback';
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', provider.clientId);
  url.searchParams.set('redirect_uri', callback);
  url.searchParams.set('scope', provider.scope);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', await sha256Base64Url(codeVerifier));
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function consumeAttempt(env: Env, state: string): Promise<OAuthAttempt> {
  const attempt = await database(env).first<OAuthAttempt>(
    'DELETE FROM oauth_attempt WHERE state = ? AND expires_at > ? RETURNING provider, nonce, code_verifier, return_to',
    [state, now()],
  );
  if (!attempt) throw new Error('OAuth state is missing, expired, or already used');
  return attempt;
}

async function exchangeCode(
  env: Env,
  providerName: IdentityProviderName,
  code: string,
  nonce: string,
  codeVerifier: string,
) {
  const provider = identityProvider(env, providerName);
  const discovery = await getDiscovery(provider.discoveryUrl);
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    redirect_uri: env.APP_ORIGIN + '/api/auth/' + providerName + '/callback',
    code_verifier: codeVerifier,
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
  const db = database(env);
  const subject = String(claims.sub);
  const email = typeof claims.email === 'string' ? claims.email : null;
  const displayName = typeof claims.name === 'string'
    ? claims.name
    : typeof claims.nickname === 'string'
      ? claims.nickname
      : null;
  const existing = await db.first<{ user_id: string }>(
    'SELECT user_id FROM oauth_identity WHERE provider = ? AND subject = ?',
    [provider, subject],
  );
  const timestamp = now();
  if (existing) {
    await db.batch([
      {
        sql: 'UPDATE oauth_identity SET email = ?, display_name = ?, updated_at = ? WHERE provider = ? AND subject = ?',
        params: [email, displayName, timestamp, provider, subject],
      },
      {
        sql: 'UPDATE app_user SET email = COALESCE(?, email), display_name = COALESCE(?, display_name), updated_at = ? WHERE id = ?',
        params: [email, displayName, timestamp, existing.user_id],
      },
    ]);
    return existing.user_id;
  }

  const userId = crypto.randomUUID();
  try {
    await db.batch([
      {
        sql: 'INSERT INTO app_user(id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        params: [userId, email, displayName, timestamp, timestamp],
      },
      {
        sql: 'INSERT INTO oauth_identity(provider, subject, user_id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [provider, subject, userId, email, displayName, timestamp, timestamp],
      },
      {
        sql: 'INSERT INTO credit_account(user_id, balance, updated_at) VALUES (?, 0, ?)',
        params: [userId, timestamp],
      },
      {
        sql: 'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        params: [crypto.randomUUID(), userId, userId, 'identity.created', JSON.stringify({ provider }), timestamp],
      },
    ]);
    return userId;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const winner = await db.first<{ user_id: string }>(
      'SELECT user_id FROM oauth_identity WHERE provider = ? AND subject = ?',
      [provider, subject],
    );
    if (winner) return winner.user_id;
    throw error;
  }
}

async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken(32);
  const hash = await sha256Hex(token);
  const timestamp = now();
  await database(env).run(
    'INSERT INTO app_session(token_hash, user_id, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)',
    [hash, userId, timestamp + sessionLifetime, timestamp, timestamp],
  );
  return token;
}

export async function completeLogin(
  env: Env,
  providerName: IdentityProviderName,
  state: string,
  code: string,
): Promise<{ token: string; returnTo: string }> {
  const attempt = await consumeAttempt(env, state);
  if (attempt.provider !== providerName) throw new Error('OAuth provider does not match the login attempt');
  const claims = await exchangeCode(env, attempt.provider, code, attempt.nonce, attempt.code_verifier);
  const userId = await upsertIdentity(env, attempt.provider, claims);
  return { token: await createSession(env, userId), returnTo: attempt.return_to };
}

export async function getSessionUser(env: Env, rawToken: string | undefined): Promise<SessionUser | null> {
  if (!rawToken) return null;
  const db = database(env);
  const hash = await sha256Hex(rawToken);
  const row = await db.first<{
    id: string;
    email: string | null;
    display_name: string | null;
    role: SessionUser['role'];
  }>(
    'SELECT u.id, u.email, u.display_name, u.role FROM app_session s JOIN app_user u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND s.revoked_at IS NULL AND u.deleted_at IS NULL',
    [hash, now()],
  );
  if (!row) return null;
  const role = row.id === env.ADMIN_BOOTSTRAP_USER_ID ? 'admin' : row.role;
  void db.run('UPDATE app_session SET last_seen_at = ? WHERE token_hash = ?', [now(), hash]);
  return { id: row.id, email: row.email, displayName: row.display_name, role };
}

export async function revokeSession(env: Env, rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await database(env).run(
    'UPDATE app_session SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL',
    [now(), await sha256Hex(rawToken)],
  );
}

export async function revokeAllSessions(env: Env, userId: string): Promise<void> {
  await database(env).run(
    'UPDATE app_session SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
    [now(), userId],
  );
}
