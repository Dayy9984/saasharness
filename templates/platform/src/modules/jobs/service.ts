import type { Env } from '../../platform/env';
import { database } from '../../platform/database';

export interface JobMessage<T = Record<string, unknown>> {
  id: string;
  type: string;
  payload: T;
}

export interface EnqueueJobInput<T = Record<string, unknown>> {
  type: string;
  payload: T;
  idempotencyKey: string;
  delaySeconds?: number;
}

interface JobRow {
  id: string;
  job_type: string;
  idempotency_key: string;
  payload_json: string;
  status: string;
  attempts: number | string;
}

export interface QueueMessageLike<T> {
  body: T;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

export interface QueueBatchLike<T> {
  messages: QueueMessageLike<T>[];
}

export type JobHandler = (payload: Record<string, unknown>, context: { env: Env; jobId: string }) => Promise<void>;
const handlers = new Map<string, JobHandler>();

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable((value as Record<string, unknown>)[key])]));
  }
  return value;
}

function stableJson(value: unknown) {
  return JSON.stringify(stable(value));
}

export function registerJobHandler(type: string, handler: JobHandler) {
  if (!type || handlers.has(type)) throw new Error(`job handler is missing or already registered: ${type}`);
  handlers.set(type, handler);
}

export async function enqueueJob<T extends Record<string, unknown>>(env: Env, input: EnqueueJobInput<T>) {
  if (!env.JOBS_QUEUE) throw new Error('JOBS_QUEUE binding is required');
  if (!input.type || !input.idempotencyKey) throw new Error('job type and idempotencyKey are required');
  const payloadJson = stableJson(input.payload);
  if (payloadJson.length > 128 * 1024) throw new Error('job payload exceeds 128KB');
  const db = database(env);
  const scopedKey = `job:${input.type}:${input.idempotencyKey}`;
  let row = await db.first<JobRow>(
    'SELECT id, job_type, idempotency_key, payload_json, status, attempts FROM job_record WHERE idempotency_key = ?',
    [scopedKey],
  );
  let replayed = true;
  if (!row) {
    const id = 'job_' + crypto.randomUUID().replaceAll('-', '');
    const timestamp = Date.now();
    try {
      await db.run(
        `INSERT INTO job_record(
          id, job_type, idempotency_key, payload_json, status, attempts,
          available_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [id, input.type, scopedKey, payloadJson, 'pending', timestamp + (input.delaySeconds ?? 0) * 1000, timestamp, timestamp],
      );
      row = { id, job_type: input.type, idempotency_key: scopedKey, payload_json: payloadJson, status: 'pending', attempts: 0 };
      replayed = false;
    } catch (error) {
      row = await db.first<JobRow>(
        'SELECT id, job_type, idempotency_key, payload_json, status, attempts FROM job_record WHERE idempotency_key = ?',
        [scopedKey],
      );
      if (!row) throw error;
    }
  }
  if (row.job_type !== input.type || row.payload_json !== payloadJson) {
    throw new Error(`job idempotency key collision: ${input.idempotencyKey}`);
  }
  if (!['queued', 'processing', 'completed'].includes(row.status)) {
    try {
      await env.JOBS_QUEUE.send({ id: row.id, type: input.type, payload: input.payload }, {
        delaySeconds: input.delaySeconds,
      });
      await db.run(
        'UPDATE job_record SET status = ?, available_at = ?, updated_at = ?, last_error = NULL WHERE id = ?',
        ['queued', Date.now() + (input.delaySeconds ?? 0) * 1000, Date.now(), row.id],
      );
    } catch (error) {
      await db.run(
        'UPDATE job_record SET status = ?, updated_at = ?, last_error = ? WHERE id = ?',
        ['failed', Date.now(), error instanceof Error ? error.message : String(error), row.id],
      );
      throw error;
    }
  }
  return { id: row.id, replayed, status: row.status === 'completed' ? 'completed' : 'queued' };
}

async function processMessage(env: Env, message: QueueMessageLike<JobMessage>) {
  const db = database(env);
  const body = message.body;
  const row = await db.first<JobRow>(
    'SELECT id, job_type, idempotency_key, payload_json, status, attempts FROM job_record WHERE id = ?',
    [body.id],
  );
  if (!row || row.status === 'completed') {
    message.ack();
    return;
  }
  const handler = handlers.get(body.type);
  if (!handler) {
    await db.run(
      'UPDATE job_record SET status = ?, attempts = attempts + 1, updated_at = ?, last_error = ? WHERE id = ?',
      ['failed', Date.now(), `no registered handler for ${body.type}`, body.id],
    );
    message.retry({ delaySeconds: 60 });
    return;
  }
  await db.run(
    'UPDATE job_record SET status = ?, attempts = attempts + 1, updated_at = ?, last_error = NULL WHERE id = ?',
    ['processing', Date.now(), body.id],
  );
  try {
    await handler(body.payload, { env, jobId: body.id });
    await db.run(
      'UPDATE job_record SET status = ?, completed_at = ?, updated_at = ?, last_error = NULL WHERE id = ?',
      ['completed', Date.now(), Date.now(), body.id],
    );
    message.ack();
  } catch (error) {
    const attempts = Number(row.attempts) + 1;
    await db.run(
      'UPDATE job_record SET status = ?, updated_at = ?, last_error = ? WHERE id = ?',
      ['failed', Date.now(), error instanceof Error ? error.message : String(error), body.id],
    );
    message.retry({ delaySeconds: Math.min(30 * 2 ** Math.min(attempts, 8), 3600) });
  }
}

export async function processQueueBatch(env: Env, batch: QueueBatchLike<JobMessage>) {
  await Promise.all(batch.messages.map((message) => processMessage(env, message)));
}
