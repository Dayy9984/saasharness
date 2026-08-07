import type { Env } from '../../platform/env';
import { database } from '../../platform/database';

export interface AnalyticsEventInput {
  eventName: string;
  userId?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  path?: string | null;
  referrer?: string | null;
  properties?: Record<string, unknown>;
  occurredAt?: number;
}

function cleanText(value: string | null | undefined, max: number) {
  if (!value) return null;
  return value.trim().slice(0, max) || null;
}

export async function recordAnalyticsEvent(env: Env, input: AnalyticsEventInput) {
  const eventName = cleanText(input.eventName, 100);
  if (!eventName || !/^[a-zA-Z0-9_.:-]+$/.test(eventName)) {
    throw new Error('eventName must use letters, numbers, dots, colons, underscores, or hyphens');
  }
  const properties = input.properties ?? {};
  const serialized = JSON.stringify(properties);
  if (serialized.length > 16_384) throw new Error('analytics properties exceed 16KB');
  const occurredAt = Number.isSafeInteger(input.occurredAt) ? input.occurredAt! : Date.now();
  await database(env).run(
    `INSERT INTO analytics_event(
       id, event_name, user_id, anonymous_id, session_id, path, referrer,
       properties_json, occurred_at, received_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'evt_' + crypto.randomUUID().replaceAll('-', ''),
      eventName,
      input.userId ?? null,
      cleanText(input.anonymousId, 160),
      cleanText(input.sessionId, 160),
      cleanText(input.path, 500),
      cleanText(input.referrer, 500),
      serialized,
      occurredAt,
      Date.now(),
    ],
  );
  return { accepted: true };
}
