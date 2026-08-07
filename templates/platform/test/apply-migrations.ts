import { applyD1Migrations, env } from 'cloudflare:test';
import type { Env } from '../src/platform/env';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {
    readonly __saasharnessTestBrand?: never;
  }
}

if (env.DATABASE_KIND === 'd1') {
  await applyD1Migrations(env.DB!, env.TEST_MIGRATIONS as Parameters<typeof applyD1Migrations>[1]);
}
