import type { MiddlewareHandler } from 'hono';
import type { Env } from './env';

export const observeRequests: MiddlewareHandler<{ Bindings: Env }> = async (context, next) => {
  const requestId = context.req.header('cf-ray') ?? crypto.randomUUID();
  const started = performance.now();
  context.header('x-request-id', requestId);
  await next();
  const durationMs = performance.now() - started;
  context.header('server-timing', `app;dur=${durationMs.toFixed(1)}`);
  console.log(JSON.stringify({
    type: 'http_request',
    requestId,
    method: context.req.method,
    path: context.req.path,
    status: context.res.status,
    durationMs: Number(durationMs.toFixed(1)),
    environment: context.env.APP_ENV,
  }));
};
