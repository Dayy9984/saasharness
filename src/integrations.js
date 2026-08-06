import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const INTEGRATIONS = Object.freeze({
  impeccable: {
    purpose: 'Default UI/UX critique, deterministic frontend anti-pattern detection, live browser iteration',
    default: true,
    version: '3.5.0',
    license: 'Apache-2.0',
    source: 'https://github.com/pbakaus/impeccable',
    command(provider = 'codex') {
      return ['npx', '-y', `impeccable@${this.version}`, 'install', `--providers=${provider}`, '--scope=project'];
    },
  },
  'ui-ux-pro-max': {
    purpose: 'Optional searchable UI/UX style, palette, typography, product-pattern, motion, and heuristic database',
    default: false,
    version: '2.5.0',
    license: 'REVIEW_REQUIRED',
    source: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    note: 'The repository root and CLI metadata say MIT, while cli/README.md states CC-BY-NC-4.0. Do not vendor or auto-enable until license terms are clarified.',
    command(provider = 'universal') {
      const map = { claude: 'claude', cursor: 'cursor', codex: 'codex', github: 'copilot', universal: 'universal' };
      return ['npx', '-y', `ui-ux-pro-max-cli@${this.version}`, 'init', '--ai', map[provider] ?? provider];
    },
  },
  'spec-kit': {
    purpose: 'Spec → Plan → Tasks → Implement artifact workflow and cross-artifact analysis',
    default: false,
    license: 'MIT',
    source: 'https://github.com/github/spec-kit',
    note: 'Use as an optional planning adapter. SaaS Harness keeps product.yml, ux.yml, feature.yml, and workflow state canonical.',
    instructions(provider = 'codex') {
      return `uvx --from git+https://github.com/github/spec-kit.git specify init . --integration ${provider}`;
    },
  },
  superpowers: {
    purpose: 'Brainstorming, bite-sized implementation plans, RED-GREEN-REFACTOR, subagent execution, and code review',
    default: false,
    license: 'MIT',
    source: 'https://github.com/obra/superpowers',
    note: 'SaaS Harness ships its own lean TDD skill; install upstream Superpowers when the active coding agent supports it.',
    instructions(provider = 'claude') {
      if (provider === 'claude') {
        return '/plugin marketplace add obra/superpowers-marketplace\n/plugin install superpowers@superpowers-marketplace';
      }
      return 'Install the obra/superpowers skills for your coding-agent provider, then keep SaaS Harness workflow artifacts canonical.';
    },
  },
  'open-design': {
    purpose: 'Optional external design artifact engine and plugin/skill ecosystem',
    default: false,
    license: 'Apache-2.0',
    source: 'https://github.com/nexu-io/open-design',
    note: 'Not bundled because the full desktop/design engine is large. SaaS Harness adopts the DESIGN.md and skill-contract patterns only.',
  },
});

export function listIntegrations() {
  return Object.fromEntries(Object.entries(INTEGRATIONS).map(([name, item]) => [name, {
    purpose: item.purpose,
    default: item.default,
    version: item.version ?? null,
    license: item.license,
    source: item.source,
    note: item.note ?? null,
  }]));
}

export function integrationCommand(name, provider = 'codex') {
  const integration = INTEGRATIONS[name];
  if (!integration) throw new Error(`unknown integration: ${name}`);
  if (integration.command) return { executable: integration.command(provider), cwd: '.' };
  if (integration.instructions) return { instructions: integration.instructions(provider) };
  return { instructions: `See ${integration.source}` };
}

export function installIntegration(name, provider = 'codex', projectDir = '.', execute = false) {
  const integration = INTEGRATIONS[name];
  if (!integration) throw new Error(`unknown integration: ${name}`);
  if (integration.license === 'REVIEW_REQUIRED' && execute) {
    throw new Error(`${name} requires manual license review before installation: ${integration.note}`);
  }
  const command = integrationCommand(name, provider);
  if (!execute || !command.executable) return { name, provider, execute: false, ...command };
  const [bin, ...args] = command.executable;
  const result = spawnSync(bin, args, {
    cwd: path.resolve(projectDir),
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${name} installer exited with status ${result.status}`);
  return { name, provider, execute: true, status: result.status };
}
