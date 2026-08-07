import { Hono } from 'hono';
import type { Env } from '../platform/env';
import { database } from '../platform/database';
import { observeRequests } from '../platform/observability';
import { securityHeaders } from '../platform/security';
import { runtimeConfig } from '../generated/runtime-config';
import { identityRoutes } from '../modules/identity/public';
import { billingRoutes } from '../modules/billing/public';
import { creditsRoutes } from '../modules/credits/public';
import { adminRoutes } from '../modules/admin-support/public';
import { privacyRoutes } from '../modules/privacy/public';

const app = new Hono<{ Bindings: Env }>();
app.use('*', observeRequests);
app.use('*', securityHeaders);
app.onError((error, context) => {
  const requestId = context.res.headers.get('x-request-id') ?? 'unknown';
  console.error(JSON.stringify({
    type: 'request_error',
    requestId,
    message: error.message,
    path: context.req.path,
  }));
  return context.json({ error: 'request failed', requestId }, 500);
});

app.get('/api/health', (context) => context.json({
  ok: true,
  profileHash: runtimeConfig.profileHash,
  codeReady: runtimeConfig.codeReady,
  productionReady: runtimeConfig.productionReady,
  environment: context.env.APP_ENV,
  database: context.env.DATABASE_KIND,
  modules: runtimeConfig.modules,
}));

app.get('/api/ready', async (context) => {
  const started = performance.now();
  const row = await database(context.env).first<{ ready: number | string }>('SELECT 1 AS ready');
  return context.json({
    ok: Number(row?.ready ?? 0) === 1,
    database: context.env.DATABASE_KIND,
    durationMs: Number((performance.now() - started).toFixed(1)),
  });
});

app.route('/', identityRoutes);
app.route('/', adminRoutes);
app.route('/', privacyRoutes);
if (runtimeConfig.modules.includes('billing')) app.route('/', billingRoutes);
if (runtimeConfig.modules.includes('credits')) app.route('/', creditsRoutes);

app.notFound((context) => context.json({ error: 'not found' }, 404));

export default app;
