import { spawnSync } from 'node:child_process';
import path from 'node:path';

const REFS = Object.freeze({
  specKit: 'f31b2b45eb74408f85353b00504c2ff46b159278',
  superpowers: '44c9b2d6e889982ac18c27d05a19fefe335194e1',
  openDesign: 'f2a7568dae22730fa4a2371f6db2f0eab83191e8',
  impeccable: 'a075d89bdbe60b2b00220cb0527fb5091e84215e',
  openSpec: 'd57889664cab4f2f061d236ec3ff82a5578701bb',
  gsd: '4926c2e9046ea20e7c22df55e89124d5463b267a',
  metaHarness: '44b9942127847f7421db70d8c7e48407f09a3c70',
  hermes: '01a1037d1e6d7b6eb96a786ef282c3aea4818194',
});

export const INTEGRATIONS = Object.freeze({
  'spec-kit': {
    role: 'canonical-planning-host',
    purpose: 'Constitution, clarification, specification, plan, tasks, analyze, checklist, converge, and implementation artifact workflow',
    default: true,
    required: true,
    mode: 'official-cli-plus-project-preset',
    ref: REFS.specKit,
    license: 'MIT',
    source: 'https://github.com/github/spec-kit',
    steps(provider = 'codex', projectDir = '.') {
      const source = `git+https://github.com/github/spec-kit.git@${this.ref}`;
      return [
        { executable: ['uvx', '--from', source, 'specify', 'init', '.', '--integration', provider], cwd: projectDir },
        {
          executable: [
            'uvx', '--from', source, 'specify', 'preset', 'add', '--dev',
            path.resolve(projectDir, '.saasharness', 'upstreams', 'spec-kit-b2c'),
          ],
          cwd: projectDir,
        },
      ];
    },
  },
  superpowers: {
    role: 'canonical-implementation-host',
    purpose: 'Socratic design refinement, bite-sized plans, RED-GREEN-REFACTOR, systematic debugging, subagent execution, review, and branch completion',
    default: true,
    required: true,
    mode: 'official-provider-plugin',
    ref: REFS.superpowers,
    license: 'MIT',
    source: 'https://github.com/obra/superpowers',
    instructions(provider = 'claude') {
      if (provider === 'claude') {
        return '/plugin marketplace add obra/superpowers-marketplace\n/plugin install superpowers@superpowers-marketplace';
      }
      if (provider === 'codex') {
        return 'Open /plugins, search for Superpowers, and install the official plugin. Verify the using-superpowers and test-driven-development skills are visible.';
      }
      if (provider === 'cursor') return '/add-plugin superpowers';
      return `Install obra/superpowers at ref ${this.ref} using the provider-specific instructions in its README.`;
    },
  },
  'open-design': {
    role: 'design-artifact-host',
    purpose: 'DESIGN.md-based design systems, templates, functional design skills, running artifacts, preview, and MCP handoff',
    default: true,
    required: false,
    requiredFor: ['ux-ia'],
    mode: 'external-daemon-and-mcp',
    ref: REFS.openDesign,
    license: 'Apache-2.0',
    source: 'https://github.com/nexu-io/open-design',
    fallback: 'React UX Lab plus Impeccable when Open Design is unavailable',
    instructions(provider = 'codex') {
      return `Run Open Design at ref ${this.ref}, then execute: od mcp install ${provider}. Keep the resulting design artifact and DESIGN.md as UX evidence.`;
    },
  },
  impeccable: {
    role: 'canonical-ui-critic',
    purpose: 'Default UI/UX critique, deterministic frontend anti-pattern detection, live browser iteration, audit, hardening, and motion review',
    default: true,
    required: true,
    mode: 'pinned-project-install',
    version: '3.5.0',
    ref: REFS.impeccable,
    license: 'Apache-2.0',
    source: 'https://github.com/pbakaus/impeccable',
    steps(provider = 'codex', projectDir = '.') {
      return [{
        executable: ['npx', '-y', `impeccable@${this.version}`, 'install', `--providers=${provider}`, '--scope=project'],
        cwd: projectDir,
      }];
    },
  },
  openspec: {
    role: 'canonical-living-change-host',
    purpose: 'Proposal, design, task, apply, verify, archive, and current-spec evolution after the initial baseline',
    default: true,
    required: false,
    requiredAfter: 'first approved production baseline',
    mode: 'official-npm-cli',
    version: '1.8.0',
    ref: REFS.openSpec,
    license: 'MIT',
    source: 'https://github.com/Fission-AI/OpenSpec',
    steps(_provider = 'codex', projectDir = '.') {
      return [{ executable: ['npx', '-y', `@fission-ai/openspec@${this.version}`, 'init'], cwd: projectDir }];
    },
  },
  'gsd-core': {
    role: 'optional-long-horizon-runtime',
    purpose: 'Discuss, plan, execute, verify, ship, fresh-context execution, state persistence, and recovery for unusually large phases',
    default: false,
    required: false,
    activation: 'only when the normal Superpowers small-batch path cannot keep a phase within a manageable context',
    mode: 'official-npm-installer',
    version: '1.9.1',
    ref: REFS.gsd,
    license: 'MIT',
    source: 'https://github.com/open-gsd/gsd-core',
    steps(_provider = 'codex', projectDir = '.') {
      return [{ executable: ['npx', '-y', `@opengsd/gsd-core@${this.version}`], cwd: projectDir }];
    },
  },
  'ai-saas-starter': {
    role: 'attributed-money-path-source-port',
    purpose: 'Append-only credit ledger, unique idempotency, conditional spend, compensating refunds, single-writer billing, scoped rules, and concurrency tests',
    default: true,
    required: false,
    requiredFor: ['billing', 'credits'],
    mode: 'source-level-port-with-attribution',
    ref: 'd8e51ddb4f641995097c25dc2fc1749149149e1b',
    license: 'MIT',
    source: 'https://github.com/nikandr-surkov/ai-saas-starter',
    note: 'Port the safety invariants and tests into the Cloudflare module pack; do not adopt Next.js, Better Auth, Stripe, or product-specific UI as universal defaults.',
  },
  'open-saas': {
    role: 'b2c-capability-inventory',
    purpose: 'Auth, payment, email, jobs, storage, analytics, Admin, and operational completeness reference',
    default: false,
    required: false,
    mode: 'reference-profile',
    ref: '51c8b30fcf27048aae27c71ad6b6a62b442ca54d',
    license: 'MIT',
    source: 'https://github.com/wasp-lang/open-saas',
    note: 'Use its capability inventory and tested product paths; Wasp is not the React + Cloudflare default runtime.',
  },
  'meta-harness': {
    role: 'outer-loop-harness-optimizer',
    purpose: 'Search over bounded context, retrieval, skill activation, critic, and workflow policies with prior candidate code, scores, and traces',
    default: false,
    required: false,
    mode: 'separate-research-lab',
    ref: REFS.metaHarness,
    license: 'MIT',
    source: 'https://github.com/stanford-iris-lab/meta-harness',
    activation: 'after three pilots, repeated task episodes, a frozen search set, a sealed held-out set, a fixed model/tool surface, and an explicit budget',
    note: 'Never permit candidates to edit product policy, evaluator code, held-out tasks, credentials, permissions, payment/auth/privacy modules, or production release policy.',
  },
  'hermes-agent': {
    role: 'optional-memory-and-skill-learning-backend',
    purpose: 'Persistent memory, cross-session recall, autonomous skill candidates, and an optional Meta-Harness proposer/runtime',
    default: false,
    required: false,
    mode: 'optional-research-backend',
    ref: REFS.hermes,
    license: 'MIT',
    source: 'https://github.com/NousResearch/hermes-agent',
    note: 'Hermes-created skills are unverified candidates. They cannot self-promote into the production harness or modify protected product modules.',
  },
  'ui-ux-pro-max': {
    role: 'optional-design-reference-database',
    purpose: 'Searchable UI/UX style, palette, typography, product-pattern, motion, and heuristic database',
    default: false,
    required: false,
    mode: 'optional-external-cli',
    version: '2.5.0',
    license: 'REVIEW_REQUIRED',
    source: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    note: 'The repository root and CLI metadata say MIT, while cli/README.md states CC-BY-NC-4.0. Do not vendor or auto-enable until license terms are clarified.',
    steps(provider = 'universal', projectDir = '.') {
      const map = { claude: 'claude', cursor: 'cursor', codex: 'codex', github: 'copilot', universal: 'universal' };
      return [{
        executable: ['npx', '-y', `ui-ux-pro-max-cli@${this.version}`, 'init', '--ai', map[provider] ?? provider],
        cwd: projectDir,
      }];
    },
  },
});

export function listIntegrations() {
  return Object.fromEntries(Object.entries(INTEGRATIONS).map(([name, item]) => [name, {
    role: item.role,
    purpose: item.purpose,
    default: item.default,
    required: item.required,
    requiredFor: item.requiredFor ?? null,
    requiredAfter: item.requiredAfter ?? null,
    activation: item.activation ?? null,
    mode: item.mode,
    version: item.version ?? null,
    ref: item.ref ?? null,
    license: item.license,
    source: item.source,
    note: item.note ?? null,
    fallback: item.fallback ?? null,
  }]));
}

export function integrationCommand(name, provider = 'codex', projectDir = '.') {
  const integration = INTEGRATIONS[name];
  if (!integration) throw new Error(`unknown integration: ${name}`);
  if (integration.steps) return { steps: integration.steps(provider, projectDir) };
  if (integration.instructions) return { instructions: integration.instructions(provider) };
  return { instructions: `This upstream is integrated by policy or attributed source port. See ${integration.source}` };
}

export function installIntegration(name, provider = 'codex', projectDir = '.', execute = false) {
  const integration = INTEGRATIONS[name];
  if (!integration) throw new Error(`unknown integration: ${name}`);
  if (integration.license === 'REVIEW_REQUIRED' && execute) {
    throw new Error(`${name} requires manual license review before installation: ${integration.note}`);
  }
  const command = integrationCommand(name, provider, projectDir);
  if (!execute || !command.steps) return { name, provider, execute: false, ...command };

  const completed = [];
  for (const step of command.steps) {
    const [bin, ...args] = step.executable;
    const result = spawnSync(bin, args, {
      cwd: path.resolve(step.cwd ?? projectDir),
      stdio: 'inherit',
      shell: false,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${name} installer exited with status ${result.status}: ${step.executable.join(' ')}`);
    completed.push({ executable: step.executable, status: result.status });
  }
  return { name, provider, execute: true, completed };
}
