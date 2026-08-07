function packageFile(plan) {
  return `${JSON.stringify({
    name: plan.product.name,
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc -b && vite build',
      preview: 'npm run build && vite preview',
      deploy: 'npm run build && wrangler deploy',
      check: 'tsc -b && vite build && wrangler deploy --dry-run',
      test: 'vitest run --config vitest.config.ts',
      'test:e2e': 'playwright test',
      'db:migrate:local': 'wrangler d1 migrations apply DB --local',
      'db:migrate:preview': 'wrangler d1 migrations apply DB --preview',
      'db:migrate:remote': 'wrangler d1 migrations apply DB --remote',
    },
    dependencies: {
      hono: '4.13.0',
      react: '19.2.1',
      'react-dom': '19.2.1',
    },
    devDependencies: {
      '@cloudflare/vite-plugin': '1.15.3',
      '@playwright/test': '1.59.1',
      '@types/node': '24.10.1',
      '@types/react': '19.2.7',
      '@types/react-dom': '19.2.3',
      '@vitejs/plugin-react': '5.1.1',
      typescript: '5.9.3',
      vite: '^7.0.0',
      vitest: '4.0.14',
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
    migrations_dir: 'migrations',
  };
}

function wranglerFile(plan) {
  const d1 = plan.moduleLock.adapters.database.provider === 'd1';
  const payment = plan.product.region === 'kr' ? 'toss' : 'stripe';
  const config = {
    $schema: 'node_modules/wrangler/config-schema.json',
    name: plan.product.name,
    main: './src/worker/index.ts',
    compatibility_date: '2025-10-08',
    compatibility_flags: ['nodejs_compat'],
    observability: { enabled: true },
    upload_source_maps: true,
    assets: { directory: './dist/client', not_found_handling: 'single-page-application' },
    vars: { APP_ENV: 'local', APP_ORIGIN: 'http://localhost:5173', PAYMENT_PROVIDER: payment },
    ...(d1 ? { d1_databases: [d1Binding(plan, '', '00000000-0000-0000-0000-000000000001')] } : {}),
    env: {
      preview: {
        name: `${plan.product.name}-preview`,
        vars: { APP_ENV: 'preview', APP_ORIGIN: 'https://preview.example.invalid', PAYMENT_PROVIDER: payment },
        ...(d1 ? { d1_databases: [d1Binding(plan, '-preview', '00000000-0000-0000-0000-000000000002')] } : {}),
      },
      staging: {
        name: `${plan.product.name}-staging`,
        vars: { APP_ENV: 'staging', APP_ORIGIN: 'https://staging.example.invalid', PAYMENT_PROVIDER: payment },
        ...(d1 ? { d1_databases: [d1Binding(plan, '-staging', '00000000-0000-0000-0000-000000000003')] } : {}),
      },
      production: {
        name: plan.product.name,
        vars: { APP_ENV: 'production', APP_ORIGIN: 'https://example.invalid', PAYMENT_PROVIDER: payment },
        ...(d1 ? { d1_databases: [d1Binding(plan, '-production', '00000000-0000-0000-0000-000000000004')] } : {}),
      },
    },
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function deployWorkflow(plan) {
  const migrationStep = plan.moduleLock.adapters.database.provider === 'd1'
    ? `      - run: npx wrangler d1 migrations apply DB --remote --env \${{ inputs.target }}\n        env:\n          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}\n          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}\n`
    : '';
  return `name: deploy\non:\n  pull_request:\n  workflow_dispatch:\n    inputs:\n      target:\n        description: staging or production\n        required: true\n        default: staging\njobs:\n  preview:\n    if: github.event_name == 'pull_request'\n    runs-on: ubuntu-latest\n    environment: preview\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 22 }\n      - run: npm install\n      - run: npm run check\n      - run: npx wrangler versions upload --env preview\n        env:\n          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}\n          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}\n  promote:\n    if: github.event_name == 'workflow_dispatch'\n    runs-on: ubuntu-latest\n    environment: \${{ inputs.target }}\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 22 }\n      - run: npm install\n      - run: npm run check\n${migrationStep}      - run: npx wrangler versions upload --env staging\n        if: inputs.target == 'staging'\n        env:\n          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}\n          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}\n      - run: npx wrangler deploy --env production\n        if: inputs.target == 'production'\n        env:\n          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}\n          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}\n`;
}

export function platformConfigFiles(plan) {
  return {
    'package.json': packageFile(plan),
    'wrangler.jsonc': wranglerFile(plan),
    '.github/workflows/deploy.yml': deployWorkflow(plan),
    '.dev.vars.example': `# Copy to .dev.vars. Never commit real values.\nAPP_ORIGIN=http://localhost:5173\nAPP_ENV=local\n\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\nKAKAO_CLIENT_ID=\nKAKAO_CLIENT_SECRET=\n\nPAYMENT_PROVIDER=${plan.product.region === 'kr' ? 'toss' : 'stripe'}\nSTRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET=\nSTRIPE_API_VERSION=\nTOSS_CLIENT_KEY=\nTOSS_SECRET_KEY=\n\nADMIN_BOOTSTRAP_USER_ID=\n`,
  };
}
