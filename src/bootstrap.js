import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assembleProject } from './assembler.js';
import { installPinnedIntegration } from './upstream-installers.js';
import { doctorUpstreams, syncUpstreams, upstreamSourcePath } from './upstream-workspace.js';
import { writeAgentConfig } from './orchestrator.js';

export const REQUIRED_BOOTSTRAP_INTEGRATIONS = Object.freeze(['spec-kit', 'impeccable']);

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
      agent,
      doctor,
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
