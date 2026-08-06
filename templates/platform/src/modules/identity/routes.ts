import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import { beginLogin, completeLogin, getSessionUser, revokeSession } from './service';
import { isIdentityProvider } from './providers';

const cookieName = (env: Env) => env.APP_ENV === 'local' ? 'app_session' : '__Host-app_session';
const cookieOptions = (env: Env) => ({
  httpOnly: true,
  secure: env.APP_ENV !== 'local',
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
});

export const identityRoutes = new Hono<{ Bindings: Env }>();

identityRoutes.get('/api/auth/:provider/start', async (context) => {
  const provider = context.req.param('provider');
  if (!isIdentityProvider(provider)) return context.json({ error: 'unsupported identity provider' }, 400);
  return context.redirect(await beginLogin(context.env, provider, context.req.query('returnTo') ?? null));
});

identityRoutes.get('/api/auth/:provider/callback', async (context) => {
  const provider = context.req.param('provider');
  if (!isIdentityProvider(provider)) return context.json({ error: 'unsupported identity provider' }, 400);
  const state = context.req.query('state');
  const code = context.req.query('code');
  if (!state || !code) return context.json({ error: 'state and code are required' }, 400);
  const result = await completeLogin(context.env, state, code);
  setCookie(context, cookieName(context.env), result.token, cookieOptions(context.env));
  return context.redirect(new URL(result.returnTo, context.env.APP_ORIGIN).toString());
});

identityRoutes.get('/api/auth/session', async (context) => {
  const user = await getSessionUser(context.env, getCookie(context, cookieName(context.env)));
  return context.json({ authenticated: Boolean(user), user });
});

identityRoutes.post('/api/auth/logout', async (context) => {
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const token = getCookie(context, cookieName(context.env));
  await revokeSession(context.env, token);
  deleteCookie(context, cookieName(context.env), { path: '/' });
  return context.json({ ok: true });
});

export async function requireUser(context: Context<{ Bindings: Env }>) {
  return getSessionUser(context.env, getCookie(context, cookieName(context.env)));
}
