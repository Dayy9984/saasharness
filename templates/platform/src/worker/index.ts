import { Hono } from 'hono';
import type { Env } from '../platform/env';
import { observeRequests } from '../platform/observability';
import { securityHeaders } from '../platform/security';
import { runtimeConfig } from '../generated/runtime-config';
import { identityRoutes } from '../modules/identity/public';
import { billingRoutes } from '../modules/billing/public';
import { adminRoutes } from '../modules/admin-support/public';
import { privacyRoutes } from '../modules/privacy/public';

const app = new Hono<{ Bindings: Env }>();
app.use('*', observeRequests);
app.use('*', securityHeaders);
app.onError((error, context) => {
  console.error(JSON.stringify({ type: 'request_error', message: error.message, path: context.req.path }));
  return context.json({ error: 'request failed' }, 500);
});
app.get('/api/health', (context) => context.json({
  ok: true,
  profileHash: runtimeConfig.profileHash,
  productionReady: runtimeConfig.productionReady,
  environment: context.env.APP_ENV,
}));
app.route('/', identityRoutes);
app.route('/', billingRoutes);
app.route('/', adminRoutes);
app.route('/', privacyRoutes);
export default app;
