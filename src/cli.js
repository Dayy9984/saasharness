import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { assembleProject, buildPlan } from './assembler.js';
import { ensureDir, exists, readUtf8, writeUtf8 } from './fs-utils.js';
import { routeRisk } from './risk-router.js';
import {
  workflowStatus,
  createCriticPacket,
  recordCriticReport,
  evaluateStage,
  reviseStage,
  approveStage,
} from './workflow.js';
import { listIntegrations, installIntegration } from './integrations.js';
import { bootstrapProject } from './bootstrap.js';
import { doctorUpstreams, syncUpstreams } from './upstream-workspace.js';
import { runStageLoop, writeAgentConfig } from './orchestrator.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `SaaS Harness v0.4\n\nUsage:\n  saasharness init <directory> [--name <slug>]\n  saasharness validate <contract-directory>\n  saasharness plan <contract-directory> [--prototype]\n  saasharness assemble <contract-directory> --out <directory> [--force] [--prototype]\n  saasharness bootstrap <contract-directory> --out <directory> [--provider <provider>] [--profile <core|lifecycle|all>] [--force] [--prototype] --execute\n  saasharness risk <changed-path> [more paths...]\n\n  saasharness upstreams sync <project-directory> [--profile <core|lifecycle|all>] [--name <upstream>] [--execute]\n  saasharness upstreams doctor <project-directory> [--profile <core|lifecycle|all>] [--name <upstream>]\n\n  saasharness agent init <project-directory> [--provider <provider>] [--force]\n  saasharness run <project-directory> [--stage <stage>] [--agent-config <file>] [--execute]\n\n  saasharness workflow status <project-directory>\n  saasharness workflow packet <project-directory> <stage>\n  saasharness workflow record <project-directory> <stage> <channel> --report <report.json>\n  saasharness workflow evaluate <project-directory> <stage>\n  saasharness workflow revise <project-directory> <stage>\n  saasharness workflow approve <project-directory> <stage> --by <human>\n\n  saasharness integrations list\n  saasharness integrations install <name> [--provider <provider>] [--project <directory>] [--execute]\n`;

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function options(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}

async function initContracts(directory, name) {
  await ensureDir(directory);
  const targetName = name ?? path.basename(path.resolve(directory)).replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  const templateDir = path.join(packageRoot, 'templates/contracts');
  for (const fileName of ['product.yml', 'ux.yml', 'feature.yml']) {
    const target = path.join(directory, fileName);
    if (await exists(target)) throw new Error(`refusing to overwrite ${target}`);
    let content = await readUtf8(path.join(templateDir, fileName));
    content = content.replaceAll('__PRODUCT_NAME__', targetName);
    await writeUtf8(target, content);
  }
  console.log(`created contracts in ${path.resolve(directory)}`);
}

async function runWorkflow(rest) {
  const [action, projectDir, stage, channel] = rest;
  if (action === 'status') {
    if (!projectDir) throw new Error('workflow status requires a project directory');
    console.log(JSON.stringify(await workflowStatus(projectDir), null, 2));
    return;
  }
  if (action === 'packet') {
    if (!projectDir || !stage) throw new Error('workflow packet requires <project-directory> <stage>');
    const result = await createCriticPacket(projectDir, stage);
    console.log(JSON.stringify({ targetDir: result.targetDir, packet: result.packet }, null, 2));
    return;
  }
  if (action === 'record') {
    if (!projectDir || !stage || !channel) {
      throw new Error('workflow record requires <project-directory> <stage> <channel> --report <file>');
    }
    const report = option(rest, '--report');
    if (!report) throw new Error('workflow record requires --report <file>');
    const result = await recordCriticReport(projectDir, stage, channel, report);
    console.log(JSON.stringify({ target: result.target, verdict: result.report.verdict }, null, 2));
    return;
  }
  if (action === 'evaluate') {
    if (!projectDir || !stage) throw new Error('workflow evaluate requires <project-directory> <stage>');
    console.log(JSON.stringify(await evaluateStage(projectDir, stage), null, 2));
    return;
  }
  if (action === 'revise') {
    if (!projectDir || !stage) throw new Error('workflow revise requires <project-directory> <stage>');
    console.log(JSON.stringify(await reviseStage(projectDir, stage), null, 2));
    return;
  }
  if (action === 'approve') {
    if (!projectDir || !stage) throw new Error('workflow approve requires <project-directory> <stage> --by <human>');
    const by = option(rest, '--by');
    console.log(JSON.stringify(await approveStage(projectDir, stage, by), null, 2));
    return;
  }
  throw new Error(`unknown workflow action: ${action ?? '<missing>'}`);
}

async function runIntegrations(rest) {
  const [action, name] = rest;
  if (action === 'list' || !action) {
    console.log(JSON.stringify(listIntegrations(), null, 2));
    return;
  }
  if (action === 'install') {
    if (!name) throw new Error('integrations install requires a name');
    const provider = option(rest, '--provider') ?? 'codex';
    const projectDir = option(rest, '--project') ?? '.';
    const execute = rest.includes('--execute');
    console.log(JSON.stringify(installIntegration(name, provider, projectDir, execute), null, 2));
    return;
  }
  throw new Error(`unknown integrations action: ${action}`);
}

async function runUpstreams(rest) {
  const [action, projectDir] = rest;
  if (!projectDir) throw new Error(`upstreams ${action ?? '<action>'} requires a project directory`);
  const config = {
    profile: option(rest, '--profile') ?? 'core',
    names: options(rest, '--name'),
  };
  if (action === 'sync') {
    console.log(JSON.stringify(await syncUpstreams(projectDir, { ...config, execute: rest.includes('--execute') }), null, 2));
    return;
  }
  if (action === 'doctor') {
    console.log(JSON.stringify(await doctorUpstreams(projectDir, config), null, 2));
    return;
  }
  throw new Error(`unknown upstreams action: ${action ?? '<missing>'}`);
}

async function runAgent(rest) {
  const [action, projectDir] = rest;
  if (action !== 'init') throw new Error(`unknown agent action: ${action ?? '<missing>'}`);
  if (!projectDir) throw new Error('agent init requires a project directory');
  console.log(JSON.stringify(await writeAgentConfig(projectDir, {
    provider: option(rest, '--provider') ?? 'external-agent-cli',
    force: rest.includes('--force'),
  }), null, 2));
}

export async function runCli(args) {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP);
    return;
  }
  const [command, ...rest] = args;
  if (command === 'init') {
    if (!rest[0]) throw new Error('init requires a directory');
    await initContracts(rest[0], option(rest, '--name'));
    return;
  }
  if (command === 'validate') {
    if (!rest[0]) throw new Error('validate requires a contract directory');
    const { validation } = await buildPlan(rest[0]);
    console.log(JSON.stringify(validation, null, 2));
    return;
  }
  if (command === 'plan') {
    if (!rest[0]) throw new Error('plan requires a contract directory');
    const { plan, validation } = await buildPlan(rest[0], { prototype: rest.includes('--prototype') });
    console.log(JSON.stringify({ ...plan, validationWarnings: validation.warnings }, null, 2));
    return;
  }
  if (command === 'assemble') {
    if (!rest[0]) throw new Error('assemble requires a contract directory');
    const outDir = option(rest, '--out');
    if (!outDir) throw new Error('assemble requires --out <directory>');
    const result = await assembleProject(rest[0], outDir, { force: rest.includes('--force'), prototype: rest.includes('--prototype') });
    console.log(JSON.stringify({ output: result.outDir, profileHash: result.plan.profileHash, productionReady: result.plan.productionReady, warnings: result.plan.warnings }, null, 2));
    return;
  }
  if (command === 'bootstrap') {
    if (!rest[0]) throw new Error('bootstrap requires a contract directory');
    const outDir = option(rest, '--out');
    if (!outDir) throw new Error('bootstrap requires --out <directory>');
    console.log(JSON.stringify(await bootstrapProject(rest[0], outDir, {
      provider: option(rest, '--provider') ?? 'codex',
      upstreamProfile: option(rest, '--profile') ?? 'lifecycle',
      force: rest.includes('--force'),
      prototype: rest.includes('--prototype'),
      execute: rest.includes('--execute'),
    }), null, 2));
    return;
  }
  if (command === 'risk') {
    if (rest.length === 0) throw new Error('risk requires changed paths');
    console.log(JSON.stringify(routeRisk(rest), null, 2));
    return;
  }
  if (command === 'upstreams') {
    await runUpstreams(rest);
    return;
  }
  if (command === 'agent') {
    await runAgent(rest);
    return;
  }
  if (command === 'run') {
    if (!rest[0]) throw new Error('run requires a project directory');
    console.log(JSON.stringify(await runStageLoop(rest[0], {
      stage: option(rest, '--stage'),
      configPath: option(rest, '--agent-config'),
      execute: rest.includes('--execute'),
    }), null, 2));
    return;
  }
  if (command === 'workflow') {
    await runWorkflow(rest);
    return;
  }
  if (command === 'integrations') {
    await runIntegrations(rest);
    return;
  }
  throw new Error(`unknown command: ${command}\n\n${HELP}`);
}
