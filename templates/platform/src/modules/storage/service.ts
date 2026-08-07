import type { Env, R2ObjectBodyLike } from '../../platform/env';
import { database } from '../../platform/database';

export interface StorageObjectRecord {
  id: string;
  owner_user_id: string;
  object_key: string;
  original_name: string;
  content_type: string;
  size_bytes: number | string;
  checksum_sha256: string | null;
  status: 'uploading' | 'ready' | 'deleted' | 'failed';
  idempotency_key: string;
  metadata_json: string;
  created_at: number | string;
  updated_at: number | string;
  deleted_at: number | string | null;
}

export interface StoreObjectInput {
  ownerUserId: string;
  originalName: string;
  contentType: string;
  contentLength: number;
  body: ReadableStream<Uint8Array>;
  idempotencyKey: string;
  checksumSha256?: string | null;
  metadata?: Record<string, string>;
}

function bucket(env: Env) {
  if (!env.UPLOADS) throw new Error('UPLOADS R2 binding is required');
  return env.UPLOADS;
}

function cleanName(value: string) {
  const name = value.trim().replace(/[\x00-\x1F\x7F/\\]/g, '_').slice(0, 240);
  if (!name) throw new Error('original file name is required');
  return name;
}

function cleanContentType(value: string) {
  const type = value.trim().toLowerCase().slice(0, 160);
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:;.*)?$/.test(type)) {
    throw new Error('valid content-type is required');
  }
  return type;
}

function maximumBytes(env: Env) {
  const configured = Number(env.STORAGE_MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 25 * 1024 * 1024;
}

function sameUpload(row: StorageObjectRecord, input: StoreObjectInput, name: string, contentType: string) {
  return row.owner_user_id === input.ownerUserId
    && row.original_name === name
    && row.content_type === contentType
    && Number(row.size_bytes) === input.contentLength
    && row.checksum_sha256 === (input.checksumSha256 ?? null);
}

export async function storeObject(env: Env, input: StoreObjectInput) {
  if (!input.ownerUserId || !input.idempotencyKey) throw new Error('ownerUserId and idempotencyKey are required');
  if (!Number.isSafeInteger(input.contentLength) || input.contentLength < 0) throw new Error('valid content-length is required');
  if (input.contentLength > maximumBytes(env)) throw new Error('upload exceeds configured size limit');
  const name = cleanName(input.originalName);
  const contentType = cleanContentType(input.contentType);
  const db = database(env);
  const scopedKey = `storage:${input.ownerUserId}:${input.idempotencyKey}`;
  let row = await db.first<StorageObjectRecord>(
    `SELECT id, owner_user_id, object_key, original_name, content_type, size_bytes,
            checksum_sha256, status, idempotency_key, metadata_json, created_at,
            updated_at, deleted_at
     FROM storage_object WHERE idempotency_key = ?`,
    [scopedKey],
  );
  if (row) {
    if (!sameUpload(row, input, name, contentType)) throw new Error('storage idempotency key collision');
    if (row.status === 'ready') return { object: normalizeRecord(row), replayed: true };
    if (row.status === 'deleted') throw new Error('storage idempotency key belongs to a deleted object');
  }

  if (!row) {
    const id = 'obj_' + crypto.randomUUID().replaceAll('-', '');
    const objectKey = `${input.ownerUserId}/${id}`;
    const timestamp = Date.now();
    const metadataJson = JSON.stringify(input.metadata ?? {});
    try {
      await db.run(
        `INSERT INTO storage_object(
          id, owner_user_id, object_key, original_name, content_type, size_bytes,
          checksum_sha256, status, idempotency_key, metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.ownerUserId, objectKey, name, contentType, input.contentLength, input.checksumSha256 ?? null, 'uploading', scopedKey, metadataJson, timestamp, timestamp],
      );
      row = {
        id,
        owner_user_id: input.ownerUserId,
        object_key: objectKey,
        original_name: name,
        content_type: contentType,
        size_bytes: input.contentLength,
        checksum_sha256: input.checksumSha256 ?? null,
        status: 'uploading',
        idempotency_key: scopedKey,
        metadata_json: metadataJson,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      };
    } catch (error) {
      row = await db.first<StorageObjectRecord>('SELECT * FROM storage_object WHERE idempotency_key = ?', [scopedKey]);
      if (!row) throw error;
      if (!sameUpload(row, input, name, contentType)) throw new Error('storage idempotency key collision');
    }
  }

  try {
    const stored = await bucket(env).put(row.object_key, input.body, {
      httpMetadata: {
        contentType,
        contentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
      customMetadata: {
        ownerUserId: input.ownerUserId,
        objectId: row.id,
        ...(input.metadata ?? {}),
      },
      ...(input.checksumSha256 ? { sha256: input.checksumSha256 } : {}),
    });
    const size = Number(stored?.size ?? input.contentLength);
    if (size !== input.contentLength) {
      await bucket(env).delete(row.object_key);
      throw new Error(`R2 stored size mismatch: expected ${input.contentLength}, received ${size}`);
    }
    await db.run(
      'UPDATE storage_object SET status = ?, size_bytes = ?, updated_at = ?, deleted_at = NULL WHERE id = ?',
      ['ready', size, Date.now(), row.id],
    );
    return { object: { ...normalizeRecord(row), status: 'ready', sizeBytes: size }, replayed: false };
  } catch (error) {
    await db.run(
      'UPDATE storage_object SET status = ?, updated_at = ? WHERE id = ?',
      ['failed', Date.now(), row.id],
    );
    throw error;
  }
}

function normalizeRecord(row: StorageObjectRecord) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    originalName: row.original_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    checksumSha256: row.checksum_sha256,
    status: row.status,
    metadata: JSON.parse(row.metadata_json || '{}') as Record<string, string>,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at === null ? null : Number(row.deleted_at),
  };
}

export async function getStorageObject(env: Env, ownerUserId: string, objectId: string) {
  const row = await database(env).first<StorageObjectRecord>(
    `SELECT id, owner_user_id, object_key, original_name, content_type, size_bytes,
            checksum_sha256, status, idempotency_key, metadata_json, created_at,
            updated_at, deleted_at
     FROM storage_object WHERE id = ? AND owner_user_id = ?`,
    [objectId, ownerUserId],
  );
  return row ? { record: normalizeRecord(row), internal: row } : null;
}

export async function readStorageObject(env: Env, ownerUserId: string, objectId: string) {
  const found = await getStorageObject(env, ownerUserId, objectId);
  if (!found || found.internal.status !== 'ready') return null;
  const object = await bucket(env).get(found.internal.object_key);
  if (!object?.body) throw new Error('storage metadata exists but R2 object is missing');
  return { record: found.record, object };
}

export async function listStorageObjects(env: Env, ownerUserId: string, limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
  const rows = await database(env).all<StorageObjectRecord>(
    `SELECT id, owner_user_id, object_key, original_name, content_type, size_bytes,
            checksum_sha256, status, idempotency_key, metadata_json, created_at,
            updated_at, deleted_at
     FROM storage_object WHERE owner_user_id = ? AND status <> ?
     ORDER BY created_at DESC LIMIT ?`,
    [ownerUserId, 'deleted', safeLimit],
  );
  return rows.map(normalizeRecord);
}

export async function deleteStorageObject(env: Env, ownerUserId: string, objectId: string) {
  const found = await getStorageObject(env, ownerUserId, objectId);
  if (!found) return { deleted: false, missing: true };
  if (found.internal.status === 'deleted') return { deleted: true, replayed: true };
  await bucket(env).delete(found.internal.object_key);
  const timestamp = Date.now();
  await database(env).batch([
    {
      sql: 'UPDATE storage_object SET status = ?, deleted_at = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?',
      params: ['deleted', timestamp, timestamp, objectId, ownerUserId],
    },
    {
      sql: 'INSERT INTO audit_event(id, actor_id, subject_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      params: [crypto.randomUUID(), ownerUserId, ownerUserId, 'storage.deleted', JSON.stringify({ objectId }), timestamp],
    },
  ]);
  return { deleted: true, replayed: false };
}

export function storageResponse(object: R2ObjectBodyLike, record: Awaited<ReturnType<typeof getStorageObject>> extends infer _T ? Record<string, unknown> : never) {
  return new Response(object.body, {
    headers: {
      'content-type': String(record.contentType ?? 'application/octet-stream'),
      'content-length': String(record.sizeBytes ?? object.size),
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(String(record.originalName ?? 'download'))}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
