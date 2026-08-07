function bytesToBase64Url(bytes: Uint8Array): string {
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

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const bytes = base64UrlToBytes(value);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
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

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
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

export interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
}

interface JwkWithKid extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

const discoveryCache = new Map<string, Promise<Discovery>>();
const jwksCache = new Map<string, Promise<{ keys: JwkWithKid[] }>>();

export function getDiscovery(url: string): Promise<Discovery> {
  if (!discoveryCache.has(url)) {
    discoveryCache.set(url, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error('OIDC discovery failed: ' + response.status);
      const discovery = await response.json() as Discovery;
      if (!discovery.issuer || !discovery.authorization_endpoint || !discovery.token_endpoint || !discovery.jwks_uri) {
        throw new Error('OIDC discovery document is incomplete');
      }
      return discovery;
    }));
  }
  return discoveryCache.get(url)!;
}

async function getJwks(url: string): Promise<{ keys: JwkWithKid[] }> {
  if (!jwksCache.has(url)) {
    jwksCache.set(url, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error('OIDC JWKS failed: ' + response.status);
      return await response.json() as { keys: JwkWithKid[] };
    }));
  }
  return jwksCache.get(url)!;
}

export async function verifyOidcIdToken(input: {
  idToken: string;
  discoveryUrl: string;
  clientId: string;
  nonce: string;
  clockSkewSeconds?: number;
}): Promise<Record<string, unknown>> {
  const parts = input.idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid ID token format');
  const header = JSON.parse(
    new TextDecoder().decode(base64UrlToBytes(parts[0])),
  ) as { alg?: string; kid?: string; typ?: string };
  const payload = JSON.parse(
    new TextDecoder().decode(base64UrlToBytes(parts[1])),
  ) as Record<string, unknown>;
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported ID token algorithm');

  const discovery = await getDiscovery(input.discoveryUrl);
  const jwks = await getJwks(discovery.jwks_uri);
  const jwk = jwks.keys.find((candidate) => (
    candidate.kid === header.kid
    && (!candidate.alg || candidate.alg === 'RS256')
    && (!candidate.use || candidate.use === 'sig')
  ));
  if (!jwk) throw new Error('ID token signing key not found');
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToArrayBuffer(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1]),
  );
  if (!valid) throw new Error('Invalid ID token signature');

  const issuer = payload.iss;
  const audience = payload.aud;
  const expiry = payload.exp;
  const issuedAt = payload.iat;
  const now = Math.floor(Date.now() / 1000);
  const skew = input.clockSkewSeconds ?? 60;
  if (
    issuer !== discovery.issuer
    && !(discovery.issuer === 'https://accounts.google.com' && issuer === 'accounts.google.com')
  ) throw new Error('Invalid ID token issuer');
  const audienceMatches = Array.isArray(audience)
    ? audience.includes(input.clientId)
    : audience === input.clientId;
  if (!audienceMatches) throw new Error('Invalid ID token audience');
  if (typeof expiry !== 'number' || expiry < now - skew) throw new Error('Expired ID token');
  if (typeof issuedAt === 'number' && issuedAt > now + skew) throw new Error('ID token issued in the future');
  if (payload.nonce !== input.nonce) throw new Error('Invalid ID token nonce');
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('ID token subject missing');
  }
  return payload;
}
