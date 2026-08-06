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

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `SaaS Harness v0.2

Usage:
  saasharness init <directory> [--name <slug>]
  saasharness validate <contract-directory>
  saasharness plan <contract-directory> [--prototype]
  saasharness assemble <contract-directory> --out <directory> [--force] [--prototype]
  saasharness risk <changed-path> [more paths...]

  saasharness workflow status <project-directory>
  saasharness workflow packet <project-directory> <stage>
  saasharness workflow record <project-directory> <stage> <channel> --report <report.json>
  saasharness workflow evaluate <project-directory> <stage>
  saasharness workflow revise <project-directory> <stage>
  saasharness workflow approve <project-directory> <stage> --by <human>

  saasharness integrations list
  saasharness integrations install <name> [--provider <provider>] [--project <directory>] [--execute]
`;

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
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
  if (command === 'risk') {
    if (rest.length === 0) throw new Error('risk requires changed paths');
    console.log(JSON.stringify(routeRisk(rest), null, 2));
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
