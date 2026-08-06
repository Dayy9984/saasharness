import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { assembleProject } from '../src/assembler.js';
import { runStageLoop } from '../src/orchestrator.js';
import { workflowStatus } from '../src/workflow.js';
import { tempDir, writeContracts } from '../test-support/helpers.js';

test('stage runner spawns a builder and isolated critics but never self-approves', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const project = path.join(root, 'project');
  await writeContracts(contracts);
  await assembleProject(contracts, project);

  const helpers = path.join(project, '.saasharness', 'test-agents');
  await mkdir(helpers, { recursive: true });
  const builderScript = path.join(helpers, 'builder.mjs');
  const criticScript = path.join(helpers, 'critic.mjs');
  await writeFile(builderScript, `
    import { appendFileSync } from 'node:fs';
    appendFileSync('.saasharness/builder-calls.log', process.env.SAASHARNESS_STAGE + ':' + process.env.SAASHARNESS_ROUND + '\\n');
  `);
  await writeFile(criticScript, `
    import { appendFileSync } from 'node:fs';
    appendFileSync('.saasharness/critic-calls.log', process.env.SAASHARNESS_CHANNEL + '\\n');
    process.stdout.write(JSON.stringify({
      stage: process.env.SAASHARNESS_STAGE,
      channel: process.env.SAASHARNESS_CHANNEL,
      round: Number(process.env.SAASHARNESS_ROUND),
      method: 'independent',
      verdict: 'pass',
      findings: [],
    }));
  `);
  await writeFile(path.join(project, '.saasharness', 'agent.json'), `${JSON.stringify({
    version: 1,
    provider: 'test-processes',
    builder: { command: ['node', builderScript], input: 'stdin' },
    critic: { command: ['node', criticScript], input: 'stdin', output: 'json-stdout' },
    verification: false,
  }, null, 2)}\n`);

  const result = await runStageLoop(project, { stage: 'discovery', execute: true });
  assert.equal(result.decision, 'pass');
  assert.equal(result.humanApprovalRequired, true);

  const builderCalls = (await readFile(path.join(project, '.saasharness', 'builder-calls.log'), 'utf8')).trim().split('\n');
  const criticCalls = (await readFile(path.join(project, '.saasharness', 'critic-calls.log'), 'utf8')).trim().split('\n');
  assert.deepEqual(builderCalls, ['discovery:1']);
  assert.deepEqual(criticCalls.sort(), ['intent', 'requirements']);

  const status = await workflowStatus(project);
  const discovery = status.stages.find((item) => item.stage === 'discovery');
  assert.equal(discovery.status, 'review-passed');
  assert.equal(discovery.approval, null);
  assert.equal(status.currentStage, 'discovery');
});
