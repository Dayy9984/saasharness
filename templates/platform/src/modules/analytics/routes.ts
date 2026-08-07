import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import { requireUser } from '../identity/public';
import { recordAnalyticsEvent } from './service';

export const analyticsRoutes = new Hono<{ Bindings: Env }>();

analyticsRoutes.post('/api/analytics/events', async (context) => {
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const body = await context.req.json<{
    eventName?: string;
    anonymousId?: string | null;
    sessionId?: string | null;
    path?: string | null;
    referrer?: string | null;
    properties?: Record<string, unknown>;
    occurredAt?: number;
  }>();
  if (!body.eventName) return context.json({ error: 'eventName is required' }, 400);
  const user = await requireUser(context);
  await recordAnalyticsEvent(context.env, {
    eventName: body.eventName,
    userId: user?.id ?? null,
    anonymousId: body.anonymousId,
    sessionId: body.sessionId,
    path: body.path,
    referrer: body.referrer,
    properties: body.properties,
    occurredAt: body.occurredAt,
  });
  return context.body(null, 202);
});
