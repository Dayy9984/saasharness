import type { Env } from '../../platform/env';
import { database } from '../../platform/database';

export interface OnboardingProgress {
  flowId: string;
  flowVersion: string;
  currentStepId: string | null;
  context: Record<string, unknown>;
  status: 'in-progress' | 'completed';
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
}

function validateFlowId(value: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value)) throw new Error('invalid onboarding flow id');
  return value;
}

function serializeContext(value: Record<string, unknown>) {
  const serialized = JSON.stringify(value);
  if (serialized.length > 64 * 1024) throw new Error('onboarding context exceeds 64KB');
  return serialized;
}

export async function loadOnboardingProgress(env: Env, userId: string, flowId: string) {
  const row = await database(env).first<{
    flow_id: string;
    flow_version: string;
    current_step_id: string | null;
    context_json: string;
    status: OnboardingProgress['status'];
    started_at: number | string;
    updated_at: number | string;
    completed_at: number | string | null;
  }>(
    `SELECT flow_id, flow_version, current_step_id, context_json, status,
            started_at, updated_at, completed_at
     FROM onboarding_progress WHERE user_id = ? AND flow_id = ?`,
    [userId, validateFlowId(flowId)],
  );
  if (!row) return null;
  return {
    flowId: row.flow_id,
    flowVersion: row.flow_version,
    currentStepId: row.current_step_id,
    context: JSON.parse(row.context_json) as Record<string, unknown>,
    status: row.status,
    startedAt: Number(row.started_at),
    updatedAt: Number(row.updated_at),
    completedAt: row.completed_at === null ? null : Number(row.completed_at),
  } satisfies OnboardingProgress;
}

export async function saveOnboardingProgress(
  env: Env,
  userId: string,
  input: {
    flowId: string;
    flowVersion: string;
    currentStepId: string | null;
    context: Record<string, unknown>;
    completed?: boolean;
  },
) {
  validateFlowId(input.flowId);
  if (!input.flowVersion || input.flowVersion.length > 80) throw new Error('valid onboarding flowVersion is required');
  if (input.currentStepId !== null && input.currentStepId.length > 128) throw new Error('onboarding currentStepId is too long');
  const timestamp = Date.now();
  const existing = await loadOnboardingProgress(env, userId, input.flowId);
  const startedAt = existing?.startedAt ?? timestamp;
  const status: OnboardingProgress['status'] = input.completed ? 'completed' : 'in-progress';
  await database(env).run(
    `INSERT INTO onboarding_progress(
       user_id, flow_id, flow_version, current_step_id, context_json, status,
       started_at, updated_at, completed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, flow_id) DO UPDATE SET
       flow_version = excluded.flow_version,
       current_step_id = excluded.current_step_id,
       context_json = excluded.context_json,
       status = excluded.status,
       updated_at = excluded.updated_at,
       completed_at = excluded.completed_at`,
    [
      userId,
      input.flowId,
      input.flowVersion,
      input.currentStepId,
      serializeContext(input.context),
      status,
      startedAt,
      timestamp,
      input.completed ? timestamp : null,
    ],
  );
  return loadOnboardingProgress(env, userId, input.flowId);
}

export async function clearOnboardingProgress(env: Env, userId: string, flowId: string) {
  const result = await database(env).run(
    'DELETE FROM onboarding_progress WHERE user_id = ? AND flow_id = ?',
    [userId, validateFlowId(flowId)],
  );
  return { cleared: result.changes === 1 };
}
