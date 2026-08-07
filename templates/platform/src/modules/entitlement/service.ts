import type { Env } from '../../platform/env';
import { database } from '../../platform/database';

export interface EntitlementRecord {
  entitlement_key: string;
  source_type: string;
  source_id: string;
  status: 'active' | 'grace' | 'revoked';
  expires_at: number | string | null;
  updated_at: number | string;
}

export async function getEntitlements(env: Env, userId: string): Promise<EntitlementRecord[]> {
  return database(env).all<EntitlementRecord>(
    'SELECT entitlement_key, source_type, source_id, status, expires_at, updated_at FROM entitlement WHERE user_id = ? ORDER BY entitlement_key',
    [userId],
  );
}

export async function hasEntitlement(env: Env, userId: string, key: string) {
  const row = await database(env).first<EntitlementRecord>(
    `SELECT entitlement_key, source_type, source_id, status, expires_at, updated_at
     FROM entitlement
     WHERE user_id = ? AND entitlement_key = ? AND status IN (?, ?)
       AND (expires_at IS NULL OR expires_at > ?)`,
    [userId, key, 'active', 'grace', Date.now()],
  );
  return row ?? null;
}

export async function requireEntitlement(env: Env, userId: string, key: string) {
  const entitlement = await hasEntitlement(env, userId, key);
  if (!entitlement) throw new Error(`active entitlement required: ${key}`);
  return entitlement;
}
