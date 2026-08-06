import type { Env } from '../../platform/env';
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
