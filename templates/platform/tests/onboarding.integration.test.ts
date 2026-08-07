import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { Env } from '../src/platform/env';
import {
  clearOnboardingProgress,
  loadOnboardingProgress,
  saveOnboardingProgress,
} from '../src/modules/onboarding/public';

const testEnv = env as Env;

describe('onboarding persistence', () => {
  it('creates, resumes, completes, and clears a first-value flow', async () => {
    const suffix = crypto.randomUUID();
    const userId = `onboarding-user-${suffix}`;
    const timestamp = Date.now();
    await env.DB!.prepare(
      'INSERT INTO app_user(id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(userId, `${suffix}@example.test`, 'Onboarding User', timestamp, timestamp).run();

    const started = await saveOnboardingProgress(testEnv, userId, {
      flowId: 'product-first-value',
      flowVersion: '1.0.0',
      currentStepId: 'goal',
      context: { flowData: { goal: 'Reach the first useful result' } },
    });
    expect(started?.status).toBe('in-progress');
    expect(started?.currentStepId).toBe('goal');

    const resumed = await loadOnboardingProgress(testEnv, userId, 'product-first-value');
    expect(resumed?.context).toEqual({ flowData: { goal: 'Reach the first useful result' } });

    const completed = await saveOnboardingProgress(testEnv, userId, {
      flowId: 'product-first-value',
      flowVersion: '1.0.0',
      currentStepId: null,
      context: { flowData: { goal: 'Reach the first useful result', firstActionConfirmed: true } },
      completed: true,
    });
    expect(completed?.status).toBe('completed');
    expect(completed?.completedAt).toBeGreaterThan(0);

    expect(await clearOnboardingProgress(testEnv, userId, 'product-first-value')).toEqual({ cleared: true });
    expect(await loadOnboardingProgress(testEnv, userId, 'product-first-value')).toBeNull();
  });
});
