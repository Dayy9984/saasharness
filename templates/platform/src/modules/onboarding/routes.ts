import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import { requireUser } from '../identity/public';
import {
  clearOnboardingProgress,
  loadOnboardingProgress,
  saveOnboardingProgress,
} from './service';

export const onboardingRoutes = new Hono<{ Bindings: Env }>();

onboardingRoutes.get('/api/onboarding/:flowId', async (context) => {
  context.header('cache-control', 'private, no-store');
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  return context.json({
    progress: await loadOnboardingProgress(context.env, user.id, context.req.param('flowId')),
  });
});

onboardingRoutes.put('/api/onboarding/:flowId', async (context) => {
  context.header('cache-control', 'private, no-store');
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = await context.req.json<{
    flowVersion?: string;
    currentStepId?: string | null;
    context?: Record<string, unknown>;
    completed?: boolean;
  }>();
  if (!body.flowVersion || !body.context || typeof body.context !== 'object' || Array.isArray(body.context)) {
    return context.json({ error: 'flowVersion and context object are required' }, 400);
  }
  return context.json({
    progress: await saveOnboardingProgress(context.env, user.id, {
      flowId: context.req.param('flowId'),
      flowVersion: body.flowVersion,
      currentStepId: body.currentStepId ?? null,
      context: body.context,
      completed: body.completed === true,
    }),
  });
});

onboardingRoutes.delete('/api/onboarding/:flowId', async (context) => {
  context.header('cache-control', 'private, no-store');
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  return context.json(await clearOnboardingProgress(context.env, user.id, context.req.param('flowId')));
});
