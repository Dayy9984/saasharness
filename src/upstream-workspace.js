import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists, ensureDir, readUtf8, writeUtf8 } from './fs-utils.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const UPSTREAM_PROFILES = Object.freeze({
  core: [
    'cloudflare-react-template',
    'spec-kit',
    'superpowers',
    'open-design',
    'impeccable',
    'pro-ui-engineering',
    'ai-saas-starter',
    'open-saas',
  ],
  lifecycle: [
    'cloudflare-react-template',
    'spec-kit',
    'superpowers',
    'open-design',
    'impeccable',
    'pro-ui-engineering',
    'ai-saas-starter',
    'open-saas',
    'openspec',
    'gsd-core',
    'harness-sdk',
  ],
});

const SENTINELS = Object.freeze({
  'cloudflare-react-template': 'vite-react-template/package.json',
  'spec-kit': 'pyproject.toml',
  superpowers: 'README.md',
  'open-design': 'package.json',
  impeccable: 'package.json',
  'pro-ui-engineering': 'SKILL.md',
  openspec: 'package.json',
  'gsd-core': 'package.json',
  'ai-saas-starter': 'src/lib/credits/index.ts',
  'open-saas': 'README.md',
  'harness-sdk': 'strands-ts/package.json',
  'meta-harness': 'README.md',
  'hermes-agent': 'README.md',
});

function commandResult(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    env: options.env ?? process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}${stderr ? `: ${stderr}` : ''}`);
  }
  return typeof result.stdout === 'string' ? result.stdout.trim() : '';
}

async function firstExisting(paths) {
  for (const candidate of paths) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

export async function loadUpstreamLock(workspaceDir = '.') {
  const root = path.resolve(workspaceDir);
  const lockPath = await firstExisting([
    path.join(root, '.saasharness', 'upstreams.lock.json'),
    path.join(root, 'upstreams.lock.json'),
    path.join(packageRoot, 'upstreams.lock.json'),
  ]);
  if (!lockPath) throw new Error('upstreams.lock.json was not found');
  return { lockPath, lock: JSON.parse(await readUtf8(lockPath)) };
}

export function isSyncableUpstream(entry) {
  return Boolean(
    entry
      && typeof entry.repository === 'string'
      && typeof entry.ref === 'string'
      && entry.ref.length > 0
      && entry.license !== 'UNKNOWN'
      && entry.license !== 'REVIEW_REQUIRED'
      && !String(entry.mode ?? '').startsWith('not-integrated'),
  );
}

export function selectUpstreams(lock, options = {}) {
  const entries = lock.upstreams ?? {};
  const explicit = options.names?.filter(Boolean) ?? [];
  let names;
  if (explicit.length) names = explicit;
  else if (options.profile === 'all') names = Object.keys(entries);
  else names = UPSTREAM_PROFILES[options.profile ?? 'core'] ?? UPSTREAM_PROFILES.core;

  const unique = [...new Set(names)];
  const missing = unique.filter((name) => !entries[name]);
  if (missing.length) throw new Error(`unknown upstreams: ${missing.join(', ')}`);
  return unique
    .filter((name) => isSyncableUpstream(entries[name]))
    .map((name) => ({ name, ...entries[name] }));
}

export function upstreamSourceRoot(workspaceDir = '.', options = {}) {
  return path.resolve(options.sourceRoot ?? path.join(workspaceDir, '.saasharness', 'sources'));
}

export function upstreamSourcePath(workspaceDir, name, options = {}) {
  return path.join(upstreamSourceRoot(workspaceDir, options), name);
}

export function cloneUrl(repository) {
  return `https://github.com/${repository}.git`;
}

export function upstreamClonePlan(workspaceDir, upstream, options = {}) {
  const target = upstreamSourcePath(workspaceDir, upstream.name, options);
  const repositoryUrl = cloneUrl(upstream.repository);
  return {
    name: upstream.name,
    repository: upstream.repository,
    ref: upstream.ref,
    target,
    initialize: [
      ['git', ['init', target]],
      ['git', ['-C', target, 'remote', 'add', 'origin', repositoryUrl]],
    ],
    refresh: [
      ['git', ['-C', target, 'remote', 'set-url', 'origin', repositoryUrl]],
      ['git', ['-C', target, 'fetch', '--force', '--depth', '1', 'origin', upstream.ref]],
      ['git', ['-C', target, 'checkout', '--detach', 'FETCH_HEAD']],
      ['git', ['-C', target, 'reset', '--hard', 'FETCH_HEAD']],
    ],
  };
}

async function executeClonePlan(plan) {
  const gitDir = path.join(plan.target, '.git');
  if (!await exists(gitDir)) {
    if (await exists(plan.target)) {
      throw new Error(`upstream target exists but is not a git checkout: ${plan.target}`);
    }
    await ensureDir(path.dirname(plan.target));
    for (const [command, args] of plan.initialize) commandResult(command, args);
  }
  for (const [command, args] of plan.refresh) commandResult(command, args);
  return commandResult('git', ['-C', plan.target, 'rev-parse', 'HEAD']);
}

export async function syncUpstreams(workspaceDir = '.', options = {}) {
  const { lockPath, lock } = await loadUpstreamLock(workspaceDir);
  const selected = selectUpstreams(lock, options);
  const sourceRoot = upstreamSourceRoot(workspaceDir, options);
  const plan = selected.map((upstream) => upstreamClonePlan(workspaceDir, upstream, { sourceRoot }));
  if (!options.execute) {
    return { execute: false, lockPath, sourceRoot, profile: options.profile ?? 'core', plan };
  }

  await ensureDir(sourceRoot);
  const sources = [];
  for (const item of plan) {
    const actualRef = await executeClonePlan(item);
    sources.push({
      name: item.name,
      repository: item.repository,
      expectedRef: item.ref,
      actualRef,
      path: item.target,
      status: actualRef === item.ref ? 'synced' : 'resolved-equivalent',
    });
  }
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    lockPath,
    profile: options.profile ?? 'core',
    sourceRoot,
    sources,
  };
  await writeUtf8(path.join(path.resolve(workspaceDir), '.saasharness', 'upstream-sources.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { execute: true, lockPath, sourceRoot, plan, sources };
}

function toolStatus(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error || result.status !== 0) return { available: false, version: null };
  const version = `${result.stdout ?? result.stderr ?? ''}`.trim().split(/\r?\n/)[0] || null;
  return { available: true, version };
}

export async function doctorUpstreams(workspaceDir = '.', options = {}) {
  const { lockPath, lock } = await loadUpstreamLock(workspaceDir);
  const selected = selectUpstreams(lock, options);
  const sourceRoot = upstreamSourceRoot(workspaceDir, options);
  const sources = [];
  for (const upstream of selected) {
    const target = path.join(sourceRoot, upstream.name);
    const gitDir = path.join(target, '.git');
    const sentinel = SENTINELS[upstream.name] ? path.join(target, SENTINELS[upstream.name]) : null;
    let actualRef = null;
    if (await exists(gitDir)) {
      try {
        actualRef = commandResult('git', ['-C', target, 'rev-parse', 'HEAD']);
      } catch {
        actualRef = null;
      }
    }
    const checkoutPresent = Boolean(actualRef);
    const sentinelPresent = sentinel ? await exists(sentinel) : checkoutPresent;
    sources.push({
      name: upstream.name,
      expectedRef: upstream.ref,
      actualRef,
      checkoutPresent,
      sentinel: sentinel ? path.relative(path.resolve(workspaceDir), sentinel) : null,
      sentinelPresent,
      ok: checkoutPresent && sentinelPresent && actualRef === upstream.ref,
    });
  }
  const tools = {
    git: toolStatus('git'),
    node: toolStatus('node'),
    npm: toolStatus('npm'),
    uvx: toolStatus('uvx'),
    pnpm: toolStatus('pnpm'),
  };
  return {
    ok: sources.every((source) => source.ok) && tools.git.available && tools.node.available && tools.npm.available,
    lockPath,
    sourceRoot,
    profile: options.profile ?? 'core',
    tools,
    sources,
  };
}
