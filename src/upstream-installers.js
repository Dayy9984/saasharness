import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { exists } from './fs-utils.js';
import { upstreamSourcePath } from './upstream-workspace.js';

function npmExecPackage(source, command, args = []) {
  return ['npm', ['exec', '--yes', '--package', `file:${source}`, '--', command, ...args]];
}

export function pinnedIntegrationPlan(name, projectDir = '.', provider = 'codex') {
  const root = path.resolve(projectDir);
  const source = upstreamSourcePath(root, name);
  if (name === 'spec-kit') {
    const preset = path.join(root, '.saasharness', 'upstreams', 'spec-kit-b2c');
    return {
      name,
      source,
      steps: [
        ['uvx', [
          '--from', source,
          'specify', 'init', '.',
          '--integration', provider,
          '--force',
          '--ignore-agent-tools',
        ]],
        ['uvx', ['--from', source, 'specify', 'preset', 'add', '--dev', preset]],
      ],
    };
  }
  if (name === 'impeccable') {
    return {
      name,
      source,
      steps: [
        ['npm', ['--prefix', source, 'install', '--omit=dev']],
        ['node', [
          path.join(source, 'cli', 'bin', 'cli.js'),
          'install',
          `--providers=${provider}`,
          '--scope=project',
        ]],
      ],
    };
  }
  if (name === 'openspec') {
    return { name, source, steps: [npmExecPackage(source, 'openspec', ['init'])] };
  }
  if (name === 'open-design') {
    return {
      name,
      source,
      steps: [
        ['pnpm', ['--dir', source, 'install', '--frozen-lockfile']],
        ['node', [path.join(source, 'apps', 'daemon', 'bin', 'od.mjs'), 'mcp', 'install', provider]],
      ],
    };
  }
  if (name === 'gsd-core') {
    return {
      name,
      source,
      steps: [npmExecPackage(source, 'gsd', [])],
      note: 'GSD Core is optional and should only be activated for a phase that exceeds the normal Superpowers small-batch path.',
    };
  }
  if (name === 'harness-sdk') {
    return {
      name,
      source,
      steps: [['npm', ['install', `file:${path.join(source, 'strands-ts')}`]]],
      note: 'Install only when product.yml declares agentic product capabilities.',
    };
  }
  if (name === 'superpowers') {
    return {
      name,
      source,
      steps: [],
      instructions: `Install the official provider plugin from the pinned checkout at ${source}. The coding-agent provider owns plugin activation.`,
    };
  }
  throw new Error(`no pinned installer is defined for upstream: ${name}`);
}

function runStep(step, cwd) {
  const [bin, args] = step;
  const result = spawnSync(bin, args, {
    cwd,
    stdio: 'inherit',
    encoding: 'utf8',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${bin} ${args.join(' ')} failed with status ${result.status}`);
  return { executable: [bin, ...args], status: result.status };
}

export async function installPinnedIntegration(name, projectDir = '.', provider = 'codex', execute = false) {
  const root = path.resolve(projectDir);
  const plan = pinnedIntegrationPlan(name, root, provider);
  if (!execute || plan.steps.length === 0) return { execute: false, ...plan };
  if (!await exists(path.join(plan.source, '.git'))) {
    throw new Error(`pinned upstream checkout is missing for ${name}: ${plan.source}. Run upstreams sync first.`);
  }
  const completed = plan.steps.map((step) => runStep(step, root));
  return { execute: true, name, source: plan.source, completed, note: plan.note ?? null };
}
