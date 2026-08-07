import { workflowArtifactFiles } from './artifact-templates.js';
import { MODULES } from './registry.js';

function tsString(value) {
  return JSON.stringify(value, null, 2);
}

const PLATFORM_IMPLEMENTATIONS = new Set([
  'identity',
  'analytics',
  'admin-support',
  'privacy',
  'audit',
  'observability',
  'release-support',
  'order',
  'billing',
  'subscription',
  'entitlement',
  'credits',
  'jobs',
  'email',
  'storage',
  'realtime',
  'onboarding',
]);

function moduleFile(name) {
  const metadata = MODULES[name] ?? { version: 'unregistered', status: 'unregistered' };
  return `/**
 * Generated boundary for an optional module that has no reusable runtime pack.
 * Production promotion remains blocked until this file is replaced by a tested
 * implementation and the module registry status becomes implemented.
 */
export const moduleStatus = ${JSON.stringify({
    name,
    version: metadata.version,
    status: metadata.status,
  }, null, 2)} as const;
`;
}

export function starterFiles(plan, contractRaw) {
  const packageJson = {
    name: plan.product.name,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc -b && vite build',
      preview: 'npm run build && vite preview',
      deploy: 'npm run build && wrangler deploy',
      check: 'tsc -b && vite build && wrangler deploy --dry-run',
      test: 'vitest run --config vitest.config.ts',
    },
    dependencies: { hono: '4.13.0', react: '19.2.1', 'react-dom': '19.2.1' },
    devDependencies: {
      '@cloudflare/vite-plugin': '1.15.3',
      '@types/node': '24.10.1',
      '@types/react': '19.2.7',
      '@types/react-dom': '19.2.3',
      '@vitejs/plugin-react': '5.1.1',
      typescript: '5.9.3',
      vite: '^7.0.0',
      vitest: '^4.1.0',
      wrangler: '4.88.0',
    },
  };

  const files = {
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    '.gitignore': [
      'node_modules/',
      'dist/',
      '.wrangler/',
      '.dev.vars',
      '.env*',
      '!.env.example',
      'playwright-report/',
      'test-results/',
      '.impeccable/config.local.json',
      '.impeccable/hook.cache.json',
      '.impeccable/hook.pending.json',
      '.saasharness/runs/',
      '',
    ].join('\n'),
    'index.html': '<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="color-scheme" content="light dark" /><title>SaaS Harness</title></head>\n  <body><div id="root"></div><script type="module" src="/src/react/main.tsx"></script></body>\n</html>\n',
    'vite.config.ts': "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport { cloudflare } from '@cloudflare/vite-plugin';\n\nexport default defineConfig({ plugins: [react(), cloudflare()] });\n",
    'tsconfig.json': `${JSON.stringify({
      files: [],
      references: [{ path: './tsconfig.app.json' }, { path: './tsconfig.worker.json' }],
    }, null, 2)}\n`,
    'src/react/App.tsx': `import { runtimeConfig } from '../generated/runtime-config';

export function App() {
  return (
    <main className="shell">
      <header className="shell-header">
        <h1>${plan.product.name}</h1>
        <p>Primary journey: <strong>{runtimeConfig.journey}</strong></p>
      </header>
      <dl className="shell-summary">
        <div><dt>Current feature</dt><dd>{runtimeConfig.feature.name}</dd></div>
        <div><dt>Region</dt><dd>{runtimeConfig.region}</dd></div>
        <div><dt>Database</dt><dd>{runtimeConfig.database}</dd></div>
      </dl>
      <nav className="fixture-nav" aria-label="Product workspaces">
        <a href="/__ux">React UX approval workspace</a>
        <a href="/__admin">Admin and support console</a>
      </nav>
      {!runtimeConfig.codeReady && (
        <aside role="alert">
          A selected optional module has no implementation pack. Review <code>.saasharness/plan.json</code>.
        </aside>
      )}
      {runtimeConfig.codeReady && !runtimeConfig.productionReady && (
        <aside role="status">
          Reusable code is assembled. Production remains gated on provider, staging, migration, recovery, critic, and human release evidence.
        </aside>
      )}
    </main>
  );
}
`,
    'src/react/ux-lab/fixtures.ts': `export const fixtures = {
  default: { state: 'ready', title: ${JSON.stringify(plan.feature.name)}, message: 'Review the primary workflow with realistic data.' },
  loading: { state: 'loading', title: 'Loading', message: 'Give immediate progress feedback without shifting the layout.' },
  empty: { state: 'empty', title: 'No items yet', message: 'Explain the first useful action and why it matters.' },
  error: { state: 'error', title: 'The request failed', message: 'Preserve user work, explain what happened, and provide recovery.' },
  permission: { state: 'permission', title: 'Access required', message: 'Explain why access is needed and who can grant it.' },
  paidLimit: { state: 'paid-limit', title: 'Plan limit reached', message: 'State the limit, the paid benefit, price context, and a safe next action.' },
  delayed: { state: 'delayed', title: 'Still working', message: 'Preserve progress and make it safe to leave, retry, or cancel.' },
} as const;
`,
    'src/react/styles.css': ':root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #1d232b; background: #f5f6f8; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-width: 320px; }\na { color: #1f4fbf; text-underline-offset: 3px; }\n.shell { width: min(58rem, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 80px; }\n.shell-header { max-width: 42rem; }\n.shell-header h1 { margin: 0 0 8px; font-size: clamp(1.8rem, 4vw, 2.6rem); line-height: 1.15; letter-spacing: -.025em; }\n.shell-header p { color: #68717d; }\n.shell-summary { margin: 28px 0; border-top: 1px solid #d9dee5; }\n.shell-summary div { display: grid; grid-template-columns: 160px 1fr; gap: 16px; padding: 12px 0; border-bottom: 1px solid #d9dee5; }\n.shell-summary dt { color: #6a7380; }\n.shell-summary dd { margin: 0; font-weight: 600; }\naside { margin-top: 20px; padding: 14px 16px; border: 1px solid #d0d5dd; border-radius: 8px; background: #fff; }\n.fixture-nav { display: flex; flex-wrap: wrap; gap: 16px; margin: 20px 0; }\ninput, button { font: inherit; }\n',
    'src/generated/runtime-config.ts': `export const runtimeConfig = ${tsString({
      profileHash: plan.profileHash,
      codeReady: plan.codeReady,
      productionReady: plan.productionReady,
      releaseEvidence: plan.releaseEvidence,
      journey: plan.ux.journey,
      feature: plan.feature,
      region: plan.product.region,
      monetization: plan.product.monetization,
      paymentProvider: plan.product.paymentProvider,
      database: plan.product.database,
      modules: plan.modules,
      cloudflare: plan.cloudflare,
    })} as const;\n`,
    '.saasharness/plan.json': `${JSON.stringify(plan, null, 2)}\n`,
    'module-lock.json': `${JSON.stringify(plan.moduleLock, null, 2)}\n`,
    'contracts/product.yml': contractRaw.product,
    'contracts/ux.yml': contractRaw.ux,
    'contracts/feature.yml': contractRaw.feature,
    'docs/architecture.md': `# Generated Architecture

- Profile hash: \`${plan.profileHash}\`
- Region: \`${plan.product.region}\`
- Database: \`${plan.moduleLock.adapters.database.provider}\`
- Payment: \`${plan.product.paymentProvider ?? 'none'}\`
- Modules: ${plan.modules.map((module) => `\`${module}\``).join(', ')}
- Cloudflare services: ${plan.cloudflare.map((service) => `\`${service}\``).join(', ')}
- Reusable code ready: **${plan.codeReady ? 'yes' : 'no'}**
- Production evidence complete: **${plan.productionReady ? 'yes' : 'no'}**

## Boundaries

Product features import module \`public.ts\` files only. Provider transports and protected persistence remain private to their owner module.

## Required release evidence

${plan.releaseEvidence.map((item) => `- ${item}`).join('\n')}

## Findings

${plan.warnings.length ? plan.warnings.map((warning) => `- **${warning.code}** (${warning.severity}): ${warning.message}`).join('\n') : '- None'}
`,
    'docs/ui-source-policy.md': `# UI Source and Anti-Slop Policy

## Mandatory skill order

1. Approved product and UX contracts
2. \`.agents/skills/ui-principles\`
3. \`.agents/skills/frontend-no-slop\`
4. \`.agents/skills/no-slop-ui\`
5. \`.agents/skills/anti-ui-slop\`
6. \`.agents/skills/coss\`
7. Impeccable rendered critique

The product's established design system and explicit human decisions take precedence. A localized exception such as approved Apple-style glass controls may apply to a small control surface; it never authorizes generic full-screen glassmorphism, decorative gradients, fake dashboard metrics, giant radii, filler copy, or arbitrary card grids.

Midday and other AGPL products are IA and journey references only. Their source code must not be copied into a proprietary generated product.
`,
    'AGENTS.md': `# Generated project rules

1. Follow the stage order in \`.saasharness/workflow.json\`.
2. Product documents, IA/UX, architecture, plan, implementation, and release require independent critic channels and explicit human approval.
3. Before any visible UI work, read \`SOUL.md\`, \`docs/ui-source-policy.md\`, and the installed \`ui-principles\`, \`frontend-no-slop\`, \`no-slop-ui\`, \`anti-ui-slop\`, and \`coss\` skills.
4. UX critics inspect a running React mock; source-only UX approval is invalid.
5. Preserve familiar mental models, complete the user's task, minimize decisions, and provide explicit progress, error, recovery, empty, permission, and paid-limit states.
6. Do not ship generic AI glass, gradients, giant radii, dashboard heroes, fake KPI cards, filler copy, arbitrary card grids, inert controls, or fake interactions. A human-approved SOUL.md may allow a localized material exception only.
7. Work on one releasable feature slice at a time.
8. Use RED → GREEN → REFACTOR for domain, API, data, auth, billing, permissions, credits, privacy, and observable React behavior.
9. Use scenario-first tests for complete user journeys.
10. Product features import module public APIs only. Never access provider SDKs or protected tables directly.
11. Do not weaken tests, critic evidence, migrations, UI finish rules, or release controls to obtain GREEN/PASS.
12. Use risk-routed verification. Billing, auth, privacy, credits, and migrations always run critical checks.
13. Reusable code readiness and production evidence are separate. Production requires provider sandbox evidence, staging, migration/recovery rehearsal, critic PASS, and human approval.
`,
    '.github/workflows/ci.yml': `name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run verify:critical
`,
    '.github/workflows/ui-finish.yml': `name: ui-finish
on:
  pull_request:
permissions:
  contents: read
  pull-requests: read
jobs:
  anti-slop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run source-only UI Slop Gate
        uses: uizze/uizze-ui-slop-gate@170d6c03bc493dc0f22d777207d216072c84915b
        with:
          fail-on: error
          show-uizze-link: "false"
          max-files: "200"
`,
    'THIRD_PARTY_NOTICES.md': `# Third-party sources

The generated project contains attributed ports and installed integrations from pinned commits listed in \`.saasharness/upstreams.lock.json\`.

- GitHub Spec Kit (MIT): constitution/spec/plan/tasks lifecycle through the official CLI and B2C preset.
- obra/superpowers (MIT): RED–GREEN–REFACTOR, worktree, task execution, debugging, review, and completion skills.
- Open Design (Apache-2.0): running design artifact and MCP workflow.
- Impeccable (Apache-2.0): design critique, audit, hardening, motion, and browser evidence.
- no-slop-ui, UIZZE anti-ui-slop, praeclarum UI.md, and frontend-no-slop (MIT): pinned UI rules and finish checks copied into the generated project's agent skills.
- coss apps/ui (MIT subtree): pinned Cal.com-oriented component skill and registry reference. AGPL areas of the coss repository are excluded.
- OnboardJS core/react (MIT): headless onboarding-flow engine and React bindings.
- nikandr-surkov/ai-saas-starter (MIT): credits ledger, idempotency collision, conditional spend, and refund invariants ported to D1/PostgreSQL.
- wasp-lang/open-saas (MIT): Stripe checkout, portal, subscription lifecycle, webhook, and SaaS operational coverage ported to Cloudflare.
- Cloudflare templates/workers-sdk (Apache-2.0): React/Vite/Hono/Workers seed, Hyperdrive, D1 migration, and Workers Vitest patterns.

Midday is AGPL-3.0 and is used only as a non-code IA and journey reference. SaaS UI Pro, SaaS Design/Codex, Layr, and Flows source are not bundled without a verified compatible license.

Preserve this file and \`.saasharness/licenses\` when distributing generated code.
`,
    ...workflowArtifactFiles(plan),
  };

  for (const moduleName of plan.modules) {
    if (!PLATFORM_IMPLEMENTATIONS.has(moduleName)) {
      files[`src/modules/${moduleName}/public.ts`] = moduleFile(moduleName);
    }
  }
  return files;
}
