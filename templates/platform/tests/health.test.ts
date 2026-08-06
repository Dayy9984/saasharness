import { describe, expect, it } from 'vitest';
import worker from '../src/worker';
import type { Env } from '../src/platform/env';

const unusedDb = {
  prepare() {
    throw new Error('database should not be accessed by the health test');
  },
  async batch() {
    throw new Error('database should not be accessed by the health test');
  },
};

const env = {
  DB: unusedDb,
  APP_ENV: 'local',
  APP_ORIGIN: 'http://example.test',
  PAYMENT_PROVIDER: 'stripe',
} as unknown as Env;

describe('health route', () => {
  it('returns the generated profile identity', async () => {
    const response = await worker.request('http://example.test/api/health', undefined, env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.environment).toBe('local');
  });
});
