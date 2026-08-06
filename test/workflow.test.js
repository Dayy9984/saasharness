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

async function passStage(dir, stage, channels) {
  await createCriticPacket(dir, stage);
  for (const channel of channels) {
    const reportPath = path.join(dir, `${stage}-${channel}.json`);
    await writeFile(reportPath, JSON.stringify({
      stage,
      channel,
      round: 1,
      method: channel === 'browser-evidence' ? 'browser' : 'independent',
      verdict: 'pass',
      findings: [],
    }));
    await recordCriticReport(dir, stage, channel, reportPath);
  }
  return evaluateStage(dir, stage);
}

test('every stage requires critic channels before approval', async () => {
  const dir = await workspace();
  await createCriticPacket(dir, 'discovery');
  await assert.rejects(() => approveStage(dir, 'discovery', 'owner'), /critic decision is pass/);
});

test('discovery advances to design philosophy, not directly to implementation UX', async () => {
  const dir = await workspace();
  const summary = await passStage(dir, 'discovery', ['intent', 'requirements']);
  assert.equal(summary.decision, 'pass');
  const approval = await approveStage(dir, 'discovery', 'owner');
  assert.equal(approval.nextStage, 'ux-philosophy');
});

test('design philosophy cannot be approved without SOUL.md', async () => {
  const dir = await workspace();
  const state = JSON.parse(await readFile(path.join(dir, '.saasharness', 'workflow.json'), 'utf8'));
  state.currentStage = 'ux-philosophy';
  await writeFile(path.join(dir, '.saasharness', 'workflow.json'), JSON.stringify(state, null, 2));
  await passStage(dir, 'ux-philosophy', ['product-fit', 'design-coherence']);
  await assert.rejects(() => approveStage(dir, 'ux-philosophy', 'owner'), /SOUL\.md/);
});
