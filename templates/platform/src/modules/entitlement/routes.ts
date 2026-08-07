import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireUser } from '../identity/public';
import { getEntitlements } from './service';

export const entitlementRoutes = new Hono<{ Bindings: Env }>();

entitlementRoutes.get('/api/entitlements', async (context) => {
  context.header('cache-control', 'private, no-store');
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  return context.json({ entitlements: await getEntitlements(context.env, user.id) });
});
