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

export interface R2ObjectBodyLike {
  body: ReadableStream<Uint8Array> | null;
  size: number;
  httpEtag?: string;
  checksums?: { sha256?: ArrayBuffer };
  httpMetadata?: { contentType?: string; contentDisposition?: string };
  customMetadata?: Record<string, string>;
}

export interface R2PutOptionsLike {
  httpMetadata?: { contentType?: string; contentDisposition?: string };
  customMetadata?: Record<string, string>;
  sha256?: ArrayBuffer | string;
}

export interface R2BucketLike {
  head(key: string): Promise<R2ObjectBodyLike | null>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | string,
    options?: R2PutOptionsLike,
  ): Promise<R2ObjectBodyLike | null>;
  delete(key: string | string[]): Promise<void>;
}

export interface DurableObjectIdLike {
  toString(): string;
}

export interface DurableObjectStubLike {
  fetch(request: Request): Promise<Response>;
}

export interface DurableObjectNamespaceLike {
  idFromName(name: string): DurableObjectIdLike;
  get(id: DurableObjectIdLike): DurableObjectStubLike;
}

export interface DurableObjectStorageLike {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
}

export interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
  acceptWebSocket(socket: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
}

export interface Env {
  DB?: D1DatabaseLike;
  HYPERDRIVE?: HyperdriveBinding;
  JOBS_QUEUE?: QueueBinding;
  UPLOADS?: R2BucketLike;
  REALTIME_ROOMS?: DurableObjectNamespaceLike;
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
  EMAIL_PROVIDER?: 'console' | 'resend';
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  STORAGE_MAX_UPLOAD_BYTES?: string;
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
