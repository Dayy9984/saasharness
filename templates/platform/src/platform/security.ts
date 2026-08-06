import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from './env';

export function requireSameOrigin(context: Context<{ Bindings: Env }>): Response | null {
  const origin = context.req.header('origin');
  if (!origin) return null;
  if (origin !== new URL(context.env.APP_ORIGIN).origin) {
    return context.json({ error: 'cross-origin state-changing request rejected' }, 403);
  }
  return null;
}

export const securityHeaders: MiddlewareHandler<{ Bindings: Env }> = async (context, next) => {
  await next();
  context.header('x-content-type-options', 'nosniff');
  context.header('referrer-policy', 'strict-origin-when-cross-origin');
  context.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  context.header(
    'content-security-policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://api.tosspayments.com https://accounts.google.com https://kauth.kakao.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com https://kauth.kakao.com",
  );
};
