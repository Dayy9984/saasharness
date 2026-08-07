import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/worker';

const testEnv = env;

describe('health and readiness routes', () => {
  it('returns generated profile and code readiness', async () => {
    const response = await worker.request('http://example.test/api/health', undefined, testEnv);
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.environment).toBe('local');
    expect(typeof body.profileHash).toBe('string');
    expect(typeof body.codeReady).toBe('boolean');
    expect(Array.isArray(body.modules)).toBe(true);
  });

  it('queries the real configured database binding', async () => {
    const response = await worker.request('http://example.test/api/ready', undefined, testEnv);
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.database).toBe('d1');
  });
});
