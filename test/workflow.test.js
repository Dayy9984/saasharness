import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  initialWorkflowState,
  createCriticPacket,
  recordCriticReport,
  evaluateStage,
  approveStage,
} from '../src/workflow.js';

async function workspace() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'saasharness-workflow-'));
  await mkdir(path.join(dir, '.saasharness'), { recursive: true });
  await writeFile(path.join(dir, '.saasharness', 'workflow.json'), JSON.stringify(initialWorkflowState('abc'), null, 2));
  await writeFile(path.join(dir, '.saasharness', 'critic-policy.json'), '{}');
  return dir;
}

test('every stage requires critic channels before approval', async () => {
  const dir = await workspace();
  await createCriticPacket(dir, 'discovery');
  await assert.rejects(() => approveStage(dir, 'discovery', 'owner'), /critic decision is pass/);
});

test('discovery can pass after both independent reports', async () => {
  const dir = await workspace();
  await createCriticPacket(dir, 'discovery');
  for (const channel of ['intent', 'requirements']) {
    const reportPath = path.join(dir, `${channel}.json`);
    await writeFile(reportPath, JSON.stringify({
      stage: 'discovery',
      channel,
      round: 1,
      method: 'independent',
      verdict: 'pass',
      findings: [],
    }));
    await recordCriticReport(dir, 'discovery', channel, reportPath);
  }
  const summary = await evaluateStage(dir, 'discovery');
  assert.equal(summary.decision, 'pass');
  const approval = await approveStage(dir, 'discovery', 'owner');
  assert.equal(approval.nextStage, 'ux-ia');
  const state = JSON.parse(await readFile(path.join(dir, '.saasharness', 'workflow.json'), 'utf8'));
  assert.equal(state.stages.discovery.status, 'approved');
});
