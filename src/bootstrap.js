import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { assembleProject } from './assembler.js';
import { writeAgentConfig } from './agent-config.js';
import { installPinnedIntegration } from './upstream-installers.js';
import { doctorUpstreams, syncUpstreams, upstreamSourcePath } from './upstream-workspace.js';

export const REQUIRED_BOOTSTRAP_INTEGRATIONS = Object.freeze(['spec-kit', 'impeccable']);

export const BOOTSTRAP_PROJECT_COMMANDS = Object.freeze([
  ['npm', ['install']],
  ['npm', ['audit', '--omit=dev', '--audit-level=high']],
  ['npm', ['run', 'check']],
  ['npm', ['test']],
  ['npx', ['playwright', 'install', 'chromium']],
  ['npm', ['run', 'test:e2e']],
]);

function runProjectCommand(projectDir, step) {
  const [bin, args] = step;
  const result = spawnSync(bin, args, {
    cwd: projectDir,
    stdio: 'inherit',
    encoding: 'utf8',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${bin} ${args.join(' ')} failed with status ${result.status}`);
  return { executable: [bin, ...args], status: result.status };
}

export async function bootstrapPlan(contractDir, outDir, options = {}) {
  const root = path.resolve(outDir);
  return {
    execute: false,
    contractDir: path.resolve(contractDir),
    outDir: root,
    provider: options.provider ?? 'codex',
    upstreamProfile: options.upstreamProfile ?? 'lifecycle',
    base: {
      repository: 'cloudflare/templates',
      checkout: 'cloudflare-react-template',
      template: 'vite-react-template',
    },
    integrations: REQUIRED_BOOTSTRAP_INTEGRATIONS,
    projectVerification: options.verify === false ? [] : BOOTSTRAP_PROJECT_COMMANDS,
    humanGates: ['product documents', 'React UX/IA', 'architecture', 'plan', 'release'],
  };
}

export async function bootstrapProject(contractDir, outDir, options = {}) {
  if (!options.execute) return bootstrapPlan(contractDir, outDir, options);

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'saasharness-upstream-base-'));
  try {
    const baseSync = await syncUpstreams(tempRoot, {
      execute: true,
      names: ['cloudflare-react-template'],
      sourceRoot: path.join(tempRoot, 'sources'),
    });
    const baseTemplateDir = path.join(
      upstreamSourcePath(tempRoot, 'cloudflare-react-template', { sourceRoot: baseSync.sourceRoot }),
      'vite-react-template',
    );

    const assembled = await assembleProject(contractDir, outDir, {
      force: options.force ?? false,
      prototype: options.prototype ?? false,
      baseTemplateDir,
    });

    const upstreams = await syncUpstreams(assembled.outDir, {
      execute: true,
      profile: options.upstreamProfile ?? 'lifecycle',
    });
    const agent = await writeAgentConfig(assembled.outDir, {
      provider: options.provider ?? 'codex',
      force: options.forceAgentConfig ?? false,
    });

    const integrations = [];
    for (const name of REQUIRED_BOOTSTRAP_INTEGRATIONS) {
      integrations.push(await installPinnedIntegration(name, assembled.outDir, options.provider ?? 'codex', true));
    }
    const manualIntegrations = [
      await installPinnedIntegration('superpowers', assembled.outDir, options.provider ?? 'codex', false),
      await installPinnedIntegration('open-design', assembled.outDir, options.provider ?? 'codex', false),
    ];

    const projectVerification = [];
    if (options.verify !== false) {
      for (const step of BOOTSTRAP_PROJECT_COMMANDS) {
        projectVerification.push(runProjectCommand(assembled.outDir, step));
      }
    }

    const doctor = await doctorUpstreams(assembled.outDir, {
      profile: options.upstreamProfile ?? 'lifecycle',
    });

    return {
      execute: true,
      output: assembled.outDir,
      profileHash: assembled.plan.profileHash,
      productionReady: assembled.plan.productionReady,
      warnings: assembled.plan.warnings,
      upstreams,
      integrations,
      manualIntegrations,
      projectVerification,
      agent,
      doctor,
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
