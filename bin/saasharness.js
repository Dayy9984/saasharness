#!/usr/bin/env node
import { runCli } from '../src/cli.js';
import { approveReleaseStage, runReleaseCommand } from '../src/release-command.js';

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(args) {
  if (args[0] === 'release') {
    await runReleaseCommand(args.slice(1));
    return;
  }
  if (args[0] === 'workflow' && args[1] === 'approve' && args[3] === 'release') {
    if (!args[2]) throw new Error('workflow approve requires a project directory');
    console.log(JSON.stringify(await approveReleaseStage(args[2], option(args, '--by')), null, 2));
    return;
  }
  await runCli(args);
}

main(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`saasharness: ${message}`);
  process.exitCode = 1;
});
