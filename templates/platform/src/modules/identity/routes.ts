import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import {
  beginLogin,
  completeLogin,
  getSessionUser,
  revokeAllSessions,
  revokeSession,
} from './service';
import { isIdentityProvider } from './providers';

const cookieName = (env: Env) => env.APP_ENV === 'local' ? 'app_session' : '__Host-app_session';
const cookieOptions = (env: Env) => ({
  httpOnly: true,
  secure: env.APP_ENV !== 'local',
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
});

function noStore(context: Context) {
  context.header('cache-control', 'private, no-store');
  context.header('pragma', 'no-cache');
}

export const identityRoutes = new Hono<{ Bindings: Env }>();

identityRoutes.get('/api/auth/:provider/start', async (context) => {
  noStore(context);
  const provider = context.req.param('provider');
  if (!isIdentityProvider(provider)) return context.json({ error: 'unsupported identity provider' }, 400);
  return context.redirect(await beginLogin(context.env, provider, context.req.query('returnTo') ?? null));
});

identityRoutes.get('/api/auth/:provider/callback', async (context) => {
  noStore(context);
  const provider = context.req.param('provider');
  if (!isIdentityProvider(provider)) return context.json({ error: 'unsupported identity provider' }, 400);
  const state = context.req.query('state');
  const code = context.req.query('code');
  const providerError = context.req.query('error');
  if (providerError) {
    return context.redirect(new URL('/login?error=' + encodeURIComponent(providerError), context.env.APP_ORIGIN).toString());
  }
  if (!state || !code) return context.json({ error: 'state and code are required' }, 400);
  const result = await completeLogin(context.env, provider, state, code);
  setCookie(context, cookieName(context.env), result.token, cookieOptions(context.env));
  return context.redirect(new URL(result.returnTo, context.env.APP_ORIGIN).toString());
});

identityRoutes.get('/api/auth/session', async (context) => {
  noStore(context);
  const user = await getSessionUser(context.env, getCookie(context, cookieName(context.env)));
  return context.json({ authenticated: Boolean(user), user });
});

identityRoutes.post('/api/auth/logout', async (context) => {
  noStore(context);
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const token = getCookie(context, cookieName(context.env));
  await revokeSession(context.env, token);
  deleteCookie(context, cookieName(context.env), { path: '/', secure: context.env.APP_ENV !== 'local' });
  return context.json({ ok: true });
});

identityRoutes.post('/api/auth/logout-all', async (context) => {
  noStore(context);
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  await revokeAllSessions(context.env, user.id);
  deleteCookie(context, cookieName(context.env), { path: '/', secure: context.env.APP_ENV !== 'local' });
  return context.json({ ok: true });
});

export async function requireUser(context: Context<{ Bindings: Env }>) {
  return getSessionUser(context.env, getCookie(context, cookieName(context.env)));
}
