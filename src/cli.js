import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { assembleProject, buildPlan } from './assembler.js';
import { ensureDir, exists, readUtf8, writeUtf8 } from './fs-utils.js';
import { routeRisk } from './risk-router.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `SaaS Harness v0.1\n\nUsage:\n  saasharness init <directory> [--name <slug>]\n  saasharness validate <contract-directory>\n  saasharness plan <contract-directory>\n  saasharness assemble <contract-directory> --out <directory> [--force]\n  saasharness risk <changed-path> [more paths...]\n`;

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
    const { plan, validation } = await buildPlan(rest[0]);
    console.log(JSON.stringify({ ...plan, validationWarnings: validation.warnings }, null, 2));
    return;
  }
  if (command === 'assemble') {
    if (!rest[0]) throw new Error('assemble requires a contract directory');
    const outDir = option(rest, '--out');
    if (!outDir) throw new Error('assemble requires --out <directory>');
    const result = await assembleProject(rest[0], outDir, { force: rest.includes('--force') });
    console.log(JSON.stringify({ output: result.outDir, profileHash: result.plan.profileHash, productionReady: result.plan.productionReady, warnings: result.plan.warnings }, null, 2));
    return;
  }
  if (command === 'risk') {
    if (rest.length === 0) throw new Error('risk requires changed paths');
    console.log(JSON.stringify(routeRisk(rest), null, 2));
    return;
  }
  throw new Error(`unknown command: ${command}\n\n${HELP}`);
}
