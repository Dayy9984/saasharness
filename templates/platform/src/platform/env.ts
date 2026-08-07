export interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  meta?: { changes?: number; last_row_id?: number | string };
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}

export interface HyperdriveBinding {
  connectionString: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export interface QueueBinding<T = unknown> {
  send(message: T, options?: { delaySeconds?: number }): Promise<void>;
  sendBatch(messages: { body: T; delaySeconds?: number }[]): Promise<void>;
}

export interface R2BucketLike {
  get(key: string): Promise<unknown>;
  put(key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream | string): Promise<unknown>;
  delete(key: string | string[]): Promise<void>;
}

export interface Env {
  DB?: D1DatabaseLike;
  HYPERDRIVE?: HyperdriveBinding;
  JOBS_QUEUE?: QueueBinding;
  UPLOADS?: R2BucketLike;
  DATABASE_KIND: 'd1' | 'postgres-hyperdrive';
  APP_ENV: 'local' | 'preview' | 'staging' | 'production';
  APP_ORIGIN: string;
  PAYMENT_PROVIDER: 'stripe' | 'toss';
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  KAKAO_CLIENT_ID?: string;
  KAKAO_CLIENT_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_API_VERSION?: string;
  TOSS_CLIENT_KEY?: string;
  TOSS_SECRET_KEY?: string;
  ADMIN_BOOTSTRAP_USER_ID?: string;
  ADMIN_BREAK_GLASS_TOKEN?: string;
  TEST_MIGRATIONS?: unknown;
}

export function requireEnv(env: Env, key: keyof Env): string {
  const value = env[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Missing environment binding: ' + String(key));
  }
  return value;
}
