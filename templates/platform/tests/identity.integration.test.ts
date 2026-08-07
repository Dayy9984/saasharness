import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/platform/env';
import { sha256Base64Url } from '../src/platform/crypto';
import { beginLogin, completeLogin, getSessionUser } from '../src/modules/identity/service';

function base64Url(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signedIdToken(
  privateKey: CryptoKey,
  input: { nonce: string; clientId: string; subject: string },
) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: 'https://issuer.example.test',
    aud: input.clientId,
    exp: now + 300,
    iat: now,
    nonce: input.nonce,
    sub: input.subject,
    email: `${input.subject}@example.test`,
    name: 'OIDC Test User',
  }));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

const testEnv = {
  DB: env.DB,
  DATABASE_KIND: 'd1',
  APP_ENV: 'local',
  APP_ORIGIN: 'http://example.test',
  PAYMENT_PROVIDER: 'stripe',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
} as Env;

afterEach(() => vi.unstubAllGlobals());

describe('OIDC authorization code flow', () => {
  it('uses state, nonce, PKCE, verifies the ID token, and creates a revocable session', async () => {
    const keyPair = await crypto.subtle.generateKey({
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    }, true, ['sign', 'verify']);
    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    Object.assign(publicJwk, { kid: 'test-key', alg: 'RS256', use: 'sig' });

    let idToken = '';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://accounts.google.com/.well-known/openid-configuration') {
        return Response.json({
          issuer: 'https://issuer.example.test',
          authorization_endpoint: 'https://issuer.example.test/authorize',
          token_endpoint: 'https://issuer.example.test/token',
          jwks_uri: 'https://issuer.example.test/jwks',
        });
      }
      if (url === 'https://issuer.example.test/token') {
        const form = init?.body as URLSearchParams;
        expect(form.get('code_verifier')).toBeTruthy();
        expect(form.get('code')).toBe('authorization-code');
        return Response.json({ id_token: idToken });
      }
      if (url === 'https://issuer.example.test/jwks') {
        return Response.json({ keys: [publicJwk] });
      }
      throw new Error('unexpected fetch: ' + url);
    });
    vi.stubGlobal('fetch', fetchMock);

    const authorizationUrl = new URL(await beginLogin(testEnv, 'google', '/dashboard'));
    const state = authorizationUrl.searchParams.get('state')!;
    const nonce = authorizationUrl.searchParams.get('nonce')!;
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
    const attempt = await env.DB!.prepare(
      'SELECT code_verifier, return_to FROM oauth_attempt WHERE state = ?',
    ).bind(state).first<{ code_verifier: string; return_to: string }>();
    expect(attempt?.return_to).toBe('/dashboard');
    expect(authorizationUrl.searchParams.get('code_challenge')).toBe(
      await sha256Base64Url(attempt!.code_verifier),
    );

    const subject = 'oidc-' + crypto.randomUUID();
    idToken = await signedIdToken(keyPair.privateKey, {
      nonce,
      clientId: testEnv.GOOGLE_CLIENT_ID!,
      subject,
    });
    const completed = await completeLogin(testEnv, 'google', state, 'authorization-code');
    expect(completed.returnTo).toBe('/dashboard');
    const session = await getSessionUser(testEnv, completed.token);
    expect(session?.email).toBe(`${subject}@example.test`);
    expect(session?.role).toBe('user');
    await expect(completeLogin(testEnv, 'google', state, 'authorization-code'))
      .rejects.toThrow(/missing, expired, or already used/i);
  });
});
