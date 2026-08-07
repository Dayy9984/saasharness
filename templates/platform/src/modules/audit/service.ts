import type { Env } from '../../platform/env';
import { database } from '../../platform/database';

export async function recordAuditEvent(
  env: Env,
  input: {
    actorId?: string | null;
    subjectId?: string | null;
    action: string;
    payload?: Record<string, unknown>;
  },
) {
  if (!input.action || input.action.length > 160) throw new Error('audit action is required and must be at most 160 characters');
  const payload = JSON.stringify(input.payload ?? {});
  if (payload.length > 32_768) throw new Error('audit payload exceeds 32KB');
  const id = 'audit_' + crypto.randomUUID().replaceAll('-', '');
  await database(env).run(
    'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.actorId ?? null, input.subjectId ?? null, input.action, payload, Date.now()],
  );
  return { id };
}

export function getAuditTrail(env: Env, subjectId: string, limit = 100) {
  return database(env).all(
    'SELECT id, actor_id, subject_id, action, payload_json, created_at FROM audit_event WHERE subject_id = ? ORDER BY created_at DESC LIMIT ?',
    [subjectId, Math.max(1, Math.min(500, Math.floor(limit)))],
  );
}
