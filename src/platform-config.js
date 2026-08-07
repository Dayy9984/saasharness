function databaseProvider(plan) {
  return plan.moduleLock.adapters.database.provider;
}

function paymentProvider(plan) {
  return plan.moduleLock.adapters.payment?.provider
    ?? (plan.product.region === 'kr' ? 'toss' : 'stripe');
}

function databaseScripts(plan) {
  if (databaseProvider(plan) === 'd1') {
    return {
      'db:migrate:local': 'wrangler d1 migrations apply DB --local',
      'db:migrate:preview': 'wrangler d1 migrations apply DB --remote --env preview',
      'db:migrate:staging': 'wrangler d1 migrations apply DB --remote --env staging',
      'db:migrate:production': 'wrangler d1 migrations apply DB --remote --env production',
    };
  }
  return {
    'db:migrate:local': 'node ./scripts/migrate-postgres.mjs',
    'db:migrate:preview': 'APP_ENV=preview node ./scripts/migrate-postgres.mjs',
    'db:migrate:staging': 'APP_ENV=staging node ./scripts/migrate-postgres.mjs',
    'db:migrate:production': 'APP_ENV=production node ./scripts/migrate-postgres.mjs',
  };
}

function packageFile(plan) {
  return `${JSON.stringify({
    name: plan.product.name,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc -b && vite build',
      preview: 'npm run build && vite preview',
      deploy: 'npm run build && wrangler deploy',
      lint: 'eslint .',
      typecheck: 'tsc -b',
      check: 'npm run lint && npm run typecheck && vite build && wrangler deploy --dry-run',
      'test:smoke': 'vitest run --config vitest.config.ts tests/health.test.ts',
      'test:integration': 'vitest run --config vitest.config.ts tests/*.integration.test.ts',
      'test:money': 'vitest run --config vitest.config.ts tests/credits.integration.test.ts tests/billing.integration.test.ts',
      test: 'vitest run --config vitest.config.ts',
      'test:e2e': 'playwright test',
      'verify:low': 'npm run lint && npm run test:smoke',
      'verify:medium': 'npm run check && npm test',
      'verify:high': 'npm run verify:medium && npm run test:e2e',
      'verify:critical': 'npm audit --omit=dev --audit-level=high && npm run verify:high',
      'release:assert:staging': 'node ./scripts/assert-release-evidence.mjs staging',
      'release:assert:production': 'node ./scripts/assert-release-evidence.mjs production',
      ...databaseScripts(plan),
    },
    dependencies: {
      hono: '4.13.0',
      pg: '^8.16.3',
      react: '19.2.1',
      'react-dom': '19.2.1',
    },
    devDependencies: {
      '@cloudflare/vite-plugin': '1.15.3',
      '@cloudflare/vitest-pool-workers': '0.20.2',
      '@eslint/js': '9.39.1',
      '@playwright/test': '1.59.1',
      '@types/node': '24.10.1',
      '@types/pg': '^8.15.6',
      '@types/react': '19.2.7',
      '@types/react-dom': '19.2.3',
      '@vitejs/plugin-react': '5.1.1',
      eslint: '9.39.2',
      'eslint-plugin-react-hooks': '7.0.1',
      'eslint-plugin-react-refresh': '0.4.24',
      globals: '16.5.0',
      typescript: '5.9.3',
      'typescript-eslint': '8.48.0',
      vite: '^7.0.0',
      vitest: '^4.1.0',
      wrangler: '4.88.0',
    },
  }, null, 2)}\n`;
}

function d1Binding(plan, suffix, databaseId) {
  return {
    binding: 'DB',
    database_name: `${plan.product.name}${suffix}-db`,
    database_id: databaseId,
    preview_database_id: 'DB',
    migrations_dir: 'migrations/d1',
  };
}

function hyperdriveBinding(id) {
  return [{ binding: 'HYPERDRIVE', id }];
}

function runtimeBindings(plan, suffix, identifiers) {
  if (databaseProvider(plan) === 'd1') {
    return { d1_databases: [d1Binding(plan, suffix, identifiers.d1)] };
  }
  return { hyperdrive: hyperdriveBinding(identifiers.hyperdrive) };
}

function optionalBindings(plan, suffix) {
  const bindings = {};
  if (plan.cloudflare.includes('queues')) {
    bindings.queues = {
      producers: [{ binding: 'JOBS_QUEUE', queue: `${plan.product.name}${suffix}-jobs` }],
      consumers: [{
        queue: `${plan.product.name}${suffix}-jobs`,
        max_batch_size: 10,
        max_batch_timeout: 5,
        max_retries: 5,
        dead_letter_queue: `${plan.product.name}${suffix}-jobs-dlq`,
      }],
    };
  }
  if (plan.cloudflare.includes('r2')) {
    bindings.r2_buckets = [{ binding: 'UPLOADS', bucket_name: `${plan.product.name}${suffix}-uploads` }];
  }
  if (plan.cloudflare.includes('durable-objects')) {
    bindings.durable_objects = {
      bindings: [{ name: 'REALTIME_ROOMS', class_name: 'RealtimeRoom' }],
    };
  }
  return bindings;
}

function environmentVariables(plan, environment, origin) {
  return {
    APP_ENV: environment,
    APP_ORIGIN: origin,
    DATABASE_KIND: databaseProvider(plan),
    PAYMENT_PROVIDER: paymentProvider(plan),
    EMAIL_PROVIDER: plan.modules.includes('email')
      ? environment === 'local' ? 'console' : 'resend'
      : 'console',
    STORAGE_MAX_UPLOAD_BYTES: '26214400',
  };
}

function environmentConfig(plan, environment, suffix, origin, identifiers) {
  return {
    name: environment === 'production' ? plan.product.name : `${plan.product.name}-${environment}`,
    vars: environmentVariables(plan, environment, origin),
    ...runtimeBindings(plan, suffix, identifiers),
    ...optionalBindings(plan, suffix),
  };
}

function wranglerFile(plan) {
  const config = {
    $schema: 'node_modules/wrangler/config-schema.json',
    name: plan.product.name,
    main: './src/worker/index.ts',
    compatibility_date: '2026-08-07',
    compatibility_flags: ['nodejs_compat'],
    observability: { enabled: true, head_sampling_rate: 1 },
    upload_source_maps: true,
    assets: { directory: './dist/client', not_found_handling: 'single-page-application' },
    vars: environmentVariables(plan, 'local', 'http://localhost:5173'),
    ...runtimeBindings(plan, '', {
      d1: '00000000-0000-0000-0000-000000000001',
      hyperdrive: '00000000000000000000000000000001',
    }),
    ...optionalBindings(plan, ''),
    ...(plan.cloudflare.includes('durable-objects') ? {
      migrations: [{ tag: 'v1', new_sqlite_classes: ['RealtimeRoom'] }],
    } : {}),
    env: {
      preview: environmentConfig(plan, 'preview', '-preview', 'https://preview.example.invalid', {
        d1: '00000000-0000-0000-0000-000000000002',
        hyperdrive: '00000000000000000000000000000002',
      }),
      staging: environmentConfig(plan, 'staging', '-staging', 'https://staging.example.invalid', {
        d1: '00000000-0000-0000-0000-000000000003',
        hyperdrive: '00000000000000000000000000000003',
      }),
      production: environmentConfig(plan, 'production', '-production', 'https://example.invalid', {
        d1: '00000000-0000-0000-0000-000000000004',
        hyperdrive: '00000000000000000000000000000004',
      }),
    },
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function migrationStep(plan, targetExpression = '${{ inputs.target }}') {
  if (databaseProvider(plan) === 'd1') {
    return `      - name: Apply D1 migrations\n        run: npm run db:migrate:${targetExpression}\n        env:\n          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}\n          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}\n`;
  }
  return `      - name: Apply PostgreSQL expand migrations\n        run: npm run db:migrate:${targetExpression}\n        env:\n          DATABASE_URL: \${{ secrets.DATABASE_URL }}\n`;
}

function deployWorkflow(plan) {
  return `name: deploy
on:
  pull_request:
  workflow_dispatch:
    inputs:
      target:
        description: staging or production
        required: true
        type: choice
        options: [staging, production]
        default: staging
concurrency:
  group: deploy-\${{ github.event_name == 'pull_request' && format('preview-{0}', github.event.pull_request.number) || inputs.target }}
  cancel-in-progress: false
jobs:
  preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    environment: preview
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: node ./scripts/assert-release-evidence.mjs staging
      - run: npm run verify:high
${migrationStep(plan, 'preview')}      - name: Deploy preview
        run: npx wrangler deploy --env preview
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - name: Post-deploy preview health
        run: node ./scripts/post-deploy-smoke.mjs "\${{ vars.APP_ORIGIN }}"
  promote:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    environment: \${{ inputs.target }}
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Verify source-controlled release evidence
        run: node ./scripts/assert-release-evidence.mjs "\${{ inputs.target }}"
      - name: Verify production-critical paths
        run: npm run verify:critical
${migrationStep(plan)}      - name: Deploy immutable build
        run: npx wrangler deploy --env \${{ inputs.target }}
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - name: Post-deploy health and database readiness
        run: node ./scripts/post-deploy-smoke.mjs "\${{ vars.APP_ORIGIN }}"
`;
}

function vitestConfig(plan) {
  if (databaseProvider(plan) !== 'd1') {
    return `import { defineConfig } from 'vitest/config';\n\nexport default defineConfig({\n  test: {\n    environment: 'node',\n    include: ['tests/**/*.test.ts'],\n    testTimeout: 30_000,\n  },\n});\n`;
  }
  return `import path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nimport { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';\nimport { defineConfig } from 'vitest/config';\n\nconst here = path.dirname(fileURLToPath(import.meta.url));\n\nexport default defineConfig(async () => {\n  const migrations = await readD1Migrations(path.join(here, 'migrations', 'd1'));\n  return {\n    plugins: [\n      cloudflareTest({\n        wrangler: { configPath: './wrangler.jsonc' },\n        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },\n      }),\n    ],\n    test: {\n      include: ['tests/**/*.test.ts'],\n      setupFiles: ['./test/apply-migrations.ts'],\n      testTimeout: 30_000,\n    },\n  };\n});\n`;
}

export function platformConfigFiles(plan) {
  return {
    'package.json': packageFile(plan),
    'wrangler.jsonc': wranglerFile(plan),
    'vitest.config.ts': vitestConfig(plan),
    '.github/workflows/deploy.yml': deployWorkflow(plan),
    '.dev.vars.example': `# Copy to .dev.vars. Never commit real values.\nAPP_ORIGIN=http://localhost:5173\nAPP_ENV=local\nDATABASE_KIND=${databaseProvider(plan)}\n\n# Identity\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\nKAKAO_CLIENT_ID=\nKAKAO_CLIENT_SECRET=\n\n# Payments\nPAYMENT_PROVIDER=${paymentProvider(plan)}\nSTRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET=\nSTRIPE_API_VERSION=\nTOSS_CLIENT_KEY=\nTOSS_SECRET_KEY=\n\n# Transactional email\nEMAIL_PROVIDER=console\nRESEND_API_KEY=\nEMAIL_FROM=Product <noreply@example.com>\nEMAIL_REPLY_TO=\n\n# Storage\nSTORAGE_MAX_UPLOAD_BYTES=26214400\n\n# Operations\nADMIN_BOOTSTRAP_USER_ID=\nADMIN_BREAK_GLASS_TOKEN=\n\n# PostgreSQL/Hyperdrive local development only\nDATABASE_URL=\n`,
  };
}
