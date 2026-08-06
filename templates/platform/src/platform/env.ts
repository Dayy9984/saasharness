export interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  meta?: { changes?: number };
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

export interface Env {
  DB: D1DatabaseLike;
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
}

export function requireEnv(env: Env, key: keyof Env): string {
  const value = env[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error('Missing environment binding: ' + String(key));
  return value;
}
