import { Hono } from 'hono';
import type { Env } from '../platform/env';
import { database } from '../platform/database';
import { observeRequests } from '../platform/observability';
import { securityHeaders } from '../platform/security';
import { runtimeConfig } from '../generated/runtime-config';
import { releaseApproval } from '../generated/release-approval';
import { analyticsRoutes } from '../modules/analytics/public';
import { identityRoutes } from '../modules/identity/public';
import { billingRoutes } from '../modules/billing/public';
import { creditsRoutes } from '../modules/credits/public';
import { entitlementRoutes } from '../modules/entitlement/public';
import { onboardingRoutes } from '../modules/onboarding/public';
import { adminRoutes } from '../modules/admin-support/public';
import { privacyRoutes } from '../modules/privacy/public';
import { storageRoutes } from '../modules/storage/public';
import { realtimeRoutes } from '../modules/realtime/public';
import '../modules/email/public';
import {
  processQueueBatch,
  type JobMessage,
  type QueueBatchLike,
} from '../modules/jobs/public';

export { RealtimeRoom } from '../modules/realtime/public';

const enabledModules = new Set<string>(runtimeConfig.modules);
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
  productionReady: runtimeConfig.codeReady && releaseApproval.productionReady,
  releaseApproval: {
    approvedBy: releaseApproval.approvedBy,
    approvedAt: releaseApproval.approvedAt,
    evidenceDigest: releaseApproval.evidenceDigest,
  },
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
if (enabledModules.has('analytics')) app.route('/', analyticsRoutes);
if (enabledModules.has('billing')) app.route('/', billingRoutes);
if (enabledModules.has('credits')) app.route('/', creditsRoutes);
if (enabledModules.has('entitlement')) app.route('/', entitlementRoutes);
if (enabledModules.has('onboarding')) app.route('/', onboardingRoutes);
if (enabledModules.has('storage')) app.route('/', storageRoutes);
if (enabledModules.has('realtime')) app.route('/', realtimeRoutes);

app.notFound((context) => context.json({ error: 'not found' }, 404));

const worker = {
  fetch: app.fetch,
  async queue(batch: QueueBatchLike<JobMessage>, env: Env) {
    if (!enabledModules.has('jobs')) {
      for (const message of batch.messages) message.ack();
      return;
    }
    await processQueueBatch(env, batch);
  },
};

export default worker;
