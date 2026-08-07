import { Hono } from 'hono';
import type { Env } from '../../platform/env';
import { requireSameOrigin } from '../../platform/security';
import { requireUser } from '../identity/public';
import {
  deleteStorageObject,
  getStorageObject,
  listStorageObjects,
  readStorageObject,
  storageResponse,
  storeObject,
} from './service';

export const storageRoutes = new Hono<{ Bindings: Env }>();

storageRoutes.get('/api/storage', async (context) => {
  context.header('cache-control', 'private, no-store');
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const limit = Number(context.req.query('limit') ?? 50);
  return context.json({
    objects: await listStorageObjects(context.env, user.id, Number.isFinite(limit) ? limit : 50),
  });
});

storageRoutes.get('/api/storage/:id', async (context) => {
  context.header('cache-control', 'private, no-store');
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const object = await getStorageObject(context.env, user.id, context.req.param('id'));
  if (!object || object.record.status === 'deleted') return context.json({ error: 'object not found' }, 404);
  return context.json({ object: object.record });
});

storageRoutes.get('/api/storage/:id/content', async (context) => {
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const found = await readStorageObject(context.env, user.id, context.req.param('id'));
  if (!found) return context.json({ error: 'object not found' }, 404);
  return storageResponse(found.object, found.record);
});

storageRoutes.post('/api/storage', async (context) => {
  context.header('cache-control', 'private, no-store');
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const body = context.req.raw.body;
  if (!body) return context.json({ error: 'request body is required' }, 400);
  const contentLength = Number(context.req.header('content-length'));
  const originalName = context.req.header('x-file-name');
  const contentType = context.req.header('content-type');
  const idempotencyKey = context.req.header('idempotency-key');
  if (!originalName || !contentType || !idempotencyKey || !Number.isSafeInteger(contentLength)) {
    return context.json({
      error: 'x-file-name, content-type, content-length, and idempotency-key headers are required',
    }, 400);
  }
  const result = await storeObject(context.env, {
    ownerUserId: user.id,
    originalName,
    contentType,
    contentLength,
    body,
    idempotencyKey,
    checksumSha256: context.req.header('x-content-sha256') ?? null,
  });
  return context.json(result, result.replayed ? 200 : 201);
});

storageRoutes.delete('/api/storage/:id', async (context) => {
  context.header('cache-control', 'private, no-store');
  const originError = requireSameOrigin(context);
  if (originError) return originError;
  const user = await requireUser(context);
  if (!user) return context.json({ error: 'authentication required' }, 401);
  const result = await deleteStorageObject(context.env, user.id, context.req.param('id'));
  return result.missing ? context.json({ error: 'object not found' }, 404) : context.json(result);
});
