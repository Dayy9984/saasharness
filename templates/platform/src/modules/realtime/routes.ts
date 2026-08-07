import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireUser } from '../identity/public';

export const realtimeRoutes = new Hono<{ Bindings: Env }>();

function validRoomId(value: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value);
}

async function forwardRoom(context: Parameters<typeof realtimeRoutes.get>[1] extends (...args: infer _Args) => unknown ? never : never) {
  return context;
}

realtimeRoutes.get('/api/realtime/rooms/:roomId', async (context) => {
  context.header('cache-control', 'private, no-store');
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const roomId = context.req.param('roomId');
  if (!validRoomId(roomId)) return context.json({ error: 'invalid room id' }, 400);
  if (!context.env.REALTIME_ROOMS) return context.json({ error: 'realtime binding is not configured' }, 503);
  const id = context.env.REALTIME_ROOMS.idFromName(roomId);
  const stub = context.env.REALTIME_ROOMS.get(id);
  const headers = new Headers(context.req.raw.headers);
  headers.set('x-realtime-user-id', user.id);
  headers.set('x-realtime-room-id', roomId);
  return stub.fetch(new Request(context.req.raw, { headers }));
});

realtimeRoutes.get('/api/realtime/rooms/:roomId/status', async (context) => {
  context.header('cache-control', 'private, no-store');
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const roomId = context.req.param('roomId');
  if (!validRoomId(roomId)) return context.json({ error: 'invalid room id' }, 400);
  if (!context.env.REALTIME_ROOMS) return context.json({ error: 'realtime binding is not configured' }, 503);
  const id = context.env.REALTIME_ROOMS.idFromName(roomId);
  const headers = new Headers({
    'x-realtime-user-id': user.id,
    'x-realtime-room-id': roomId,
  });
  return context.env.REALTIME_ROOMS.get(id).fetch(new Request(
    new URL(`/internal/realtime/status?roomId=${encodeURIComponent(roomId)}`, context.env.APP_ORIGIN),
    { headers },
  ));
});
