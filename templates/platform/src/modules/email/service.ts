import type { Env } from '../../platform/env';
import { database } from '../../platform/database';
import { requireEnv } from '../../platform/env';
import { enqueueJob, registerJobHandler } from '../jobs/public';

export interface EmailInput {
  userId?: string | null;
  to: string;
  subject: string;
  html?: string | null;
  text?: string | null;
  templateId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
  delaySeconds?: number;
}

interface EmailRow {
  id: string;
  user_id: string | null;
  recipient: string;
  template_id: string | null;
  subject: string;
  html_body: string | null;
  text_body: string | null;
  payload_json: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'canceled';
  provider_message_id: string | null;
  idempotency_key: string;
  attempts: number | string;
  available_at: number | string;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

function sameEmail(row: EmailRow, input: EmailInput, payloadJson: string) {
  return row.user_id === (input.userId ?? null)
    && row.recipient === input.to.toLowerCase()
    && row.template_id === (input.templateId ?? null)
    && row.subject === input.subject
    && row.html_body === (input.html ?? null)
    && row.text_body === (input.text ?? null)
    && row.payload_json === payloadJson;
}

async function providerSend(env: Env, row: EmailRow) {
  const provider = env.EMAIL_PROVIDER ?? (env.APP_ENV === 'local' ? 'console' : 'resend');
  if (provider === 'console') {
    console.log(JSON.stringify({
      type: 'email_console_delivery',
      id: row.id,
      to: row.recipient,
      subject: row.subject,
    }));
    return 'console:' + row.id;
  }
  if (provider !== 'resend') throw new Error(`unsupported EMAIL_PROVIDER: ${provider}`);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + requireEnv(env, 'RESEND_API_KEY'),
      'content-type': 'application/json',
      'idempotency-key': row.idempotency_key,
    },
    body: JSON.stringify({
      from: requireEnv(env, 'EMAIL_FROM'),
      to: [row.recipient],
      subject: row.subject,
      ...(row.html_body ? { html: row.html_body } : {}),
      ...(row.text_body ? { text: row.text_body } : {}),
      ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
      tags: row.template_id ? [{ name: 'template', value: row.template_id }] : [],
    }),
  });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok || typeof body.id !== 'string') {
    throw new Error(`email provider failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body.id;
}

export async function deliverEmail(env: Env, emailId: string) {
  const db = database(env);
  const row = await db.first<EmailRow>(
    `SELECT id, user_id, recipient, template_id, subject, html_body, text_body,
            payload_json, status, provider_message_id, idempotency_key, attempts, available_at
     FROM email_outbox WHERE id = ?`,
    [emailId],
  );
  if (!row) throw new Error('email outbox row not found');
  if (row.status === 'sent') return { id: row.id, status: 'sent', providerMessageId: row.provider_message_id, replayed: true };
  if (row.status === 'canceled') return { id: row.id, status: 'canceled', providerMessageId: null, replayed: true };
  if (Number(row.available_at) > Date.now()) throw new Error('email is not available for delivery yet');

  const claimed = await db.run(
    'UPDATE email_outbox SET status = ?, attempts = attempts + 1, updated_at = ?, last_error = NULL WHERE id = ? AND status IN (?, ?)',
    ['processing', Date.now(), row.id, 'pending', 'failed'],
  );
  if (claimed.changes !== 1) {
    const current = await db.first<EmailRow>('SELECT * FROM email_outbox WHERE id = ?', [row.id]);
    return { id: row.id, status: current?.status ?? 'processing', providerMessageId: current?.provider_message_id ?? null, replayed: true };
  }
  try {
    const providerMessageId = await providerSend(env, row);
    await db.run(
      'UPDATE email_outbox SET status = ?, provider_message_id = ?, sent_at = ?, updated_at = ?, last_error = NULL WHERE id = ?',
      ['sent', providerMessageId, Date.now(), Date.now(), row.id],
    );
    return { id: row.id, status: 'sent', providerMessageId, replayed: false };
  } catch (error) {
    await db.run(
      'UPDATE email_outbox SET status = ?, updated_at = ?, last_error = ? WHERE id = ?',
      ['failed', Date.now(), error instanceof Error ? error.message : String(error), row.id],
    );
    throw error;
  }
}

export async function queueEmail(env: Env, input: EmailInput) {
  if (!validEmail(input.to)) throw new Error('a valid recipient email is required');
  if (!input.subject || input.subject.length > 998) throw new Error('email subject is required and must be at most 998 characters');
  if (!input.html && !input.text && !input.templateId) throw new Error('email html, text, or templateId is required');
  if (!input.idempotencyKey) throw new Error('email idempotencyKey is required');
  const payloadJson = JSON.stringify(input.payload ?? {});
  if (payloadJson.length > 64 * 1024) throw new Error('email payload exceeds 64KB');
  const db = database(env);
  const scopedKey = `email:${input.idempotencyKey}`;
  let row = await db.first<EmailRow>(
    `SELECT id, user_id, recipient, template_id, subject, html_body, text_body,
            payload_json, status, provider_message_id, idempotency_key, attempts, available_at
     FROM email_outbox WHERE idempotency_key = ?`,
    [scopedKey],
  );
  let replayed = true;
  if (!row) {
    const id = 'email_' + crypto.randomUUID().replaceAll('-', '');
    const timestamp = Date.now();
    try {
      await db.run(
        `INSERT INTO email_outbox(
          id, user_id, recipient, template_id, subject, html_body, text_body,
          payload_json, status, idempotency_key, attempts, available_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [
          id,
          input.userId ?? null,
          input.to.toLowerCase(),
          input.templateId ?? null,
          input.subject,
          input.html ?? null,
          input.text ?? null,
          payloadJson,
          'pending',
          scopedKey,
          timestamp + (input.delaySeconds ?? 0) * 1000,
          timestamp,
          timestamp,
        ],
      );
      row = {
        id,
        user_id: input.userId ?? null,
        recipient: input.to.toLowerCase(),
        template_id: input.templateId ?? null,
        subject: input.subject,
        html_body: input.html ?? null,
        text_body: input.text ?? null,
        payload_json: payloadJson,
        status: 'pending',
        provider_message_id: null,
        idempotency_key: scopedKey,
        attempts: 0,
        available_at: timestamp + (input.delaySeconds ?? 0) * 1000,
      };
      replayed = false;
    } catch (error) {
      row = await db.first<EmailRow>('SELECT * FROM email_outbox WHERE idempotency_key = ?', [scopedKey]);
      if (!row) throw error;
    }
  }
  if (!sameEmail(row, input, payloadJson)) throw new Error(`email idempotency key collision: ${input.idempotencyKey}`);
  if (row.status === 'sent') return { id: row.id, status: 'sent', replayed: true };
  if (env.JOBS_QUEUE) {
    await enqueueJob(env, {
      type: 'email.send',
      payload: { emailId: row.id },
      idempotencyKey: row.id,
      delaySeconds: input.delaySeconds,
    });
    return { id: row.id, status: 'queued', replayed };
  }
  const delivered = await deliverEmail(env, row.id);
  return { ...delivered, replayed };
}

let handlerRegistered = false;
export function registerEmailJobHandler() {
  if (handlerRegistered) return;
  registerJobHandler('email.send', async (payload, { env }) => {
    if (typeof payload.emailId !== 'string') throw new Error('email.send requires emailId');
    await deliverEmail(env, payload.emailId);
  });
  handlerRegistered = true;
}

export async function getEmailStatus(env: Env, emailId: string) {
  return database(env).first(
    'SELECT id, user_id, recipient, template_id, subject, status, provider_message_id, attempts, available_at, created_at, updated_at, sent_at, last_error FROM email_outbox WHERE id = ?',
    [emailId],
  );
}
