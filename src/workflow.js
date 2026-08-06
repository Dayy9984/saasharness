import path from 'node:path';
import { readUtf8, writeUtf8, ensureDir, exists } from './fs-utils.js';
import { validateCriticReport, summarizeCriticReports } from './critic.js';

export const STAGE_ORDER = Object.freeze([
  'discovery',
  'ux-ia',
  'architecture',
  'plan',
  'implementation',
  'release',
]);

export const CRITIC_POLICY = Object.freeze({
  'discovery': {
    maxRounds: 2,
    humanApproval: true,
    channels: ['intent', 'requirements'],
    artifacts: ['contracts/product.yml', 'artifacts/01-product/prd.md', 'artifacts/01-product/policies.yml'],
    evidence: ['raw user decisions', 'assumptions and unresolved questions'],
  },
  'ux-ia': {
    maxRounds: 3,
    humanApproval: true,
    channels: ['experience', 'design', 'browser-evidence'],
    artifacts: [
      'contracts/ux.yml',
      'artifacts/02-ux/ia.md',
      'artifacts/02-ux/journeys.md',
      'artifacts/02-ux/screen-contracts.yml',
      'artifacts/02-ux/design-system.md',
    ],
    evidence: ['running React mock', 'screenshots or video', 'interaction trace', 'approved references'],
  },
  'architecture': {
    maxRounds: 2,
    humanApproval: true,
    channels: ['standards', 'operability'],
    artifacts: [
      'artifacts/03-architecture/module-graph.md',
      'artifacts/03-architecture/folder-structure.md',
      'artifacts/03-architecture/db-model.md',
      'artifacts/03-architecture/cache-policy.md',
      'artifacts/03-architecture/infra-profile.md',
      'artifacts/03-architecture/latency-slo.md',
    ],
    evidence: ['module-lock.json', '.saasharness/plan.json', 'provider and data-policy decisions'],
  },
  'plan': {
    maxRounds: 2,
    humanApproval: true,
    channels: ['scope', 'testability'],
    artifacts: [
      'contracts/feature.yml',
      'artifacts/04-plan/phases.md',
      'artifacts/04-plan/tasks.md',
      'artifacts/04-plan/test-strategy.md',
    ],
    evidence: ['dependency order', 'WIP=1 slice boundary', 'acceptance and rollback'],
  },
  'implementation': {
    maxRounds: 2,
    humanApproval: true,
    channels: ['spec-compliance', 'code-quality', 'runtime-evidence'],
    artifacts: ['artifacts/05-implementation/implementation-log.md'],
    evidence: ['git diff', 'RED/GREEN evidence', 'test output', 'running preview', 'latency and error signals'],
  },
  'release': {
    maxRounds: 2,
    humanApproval: true,
    channels: ['release-risk', 'release-evidence'],
    artifacts: ['artifacts/06-release/release-plan.md', 'artifacts/06-release/runbook.md'],
    evidence: ['staging journey', 'migration rehearsal', 'rollback or forward recovery', 'production configuration'],
  },
});

const statePath = (projectDir) => path.join(projectDir, '.saasharness', 'workflow.json');
const policyPath = (projectDir) => path.join(projectDir, '.saasharness', 'critic-policy.json');
const reviewDir = (projectDir, stage, round) => path.join(projectDir, '.saasharness', 'reviews', stage, `round-${round}`);

export function initialWorkflowState(profileHash = null) {
  return {
    version: 1,
    profileHash,
    currentStage: STAGE_ORDER[0],
    stages: Object.fromEntries(STAGE_ORDER.map((stage) => [stage, {
      status: 'draft',
      round: 1,
      decision: null,
      approval: null,
      reports: {},
    }])),
  };
}

export async function loadWorkflow(projectDir) {
  const raw = await readUtf8(statePath(projectDir)).catch(() => {
    throw new Error(`workflow state not found: ${statePath(projectDir)}`);
  });
  return JSON.parse(raw);
}

export async function saveWorkflow(projectDir, state) {
  await writeUtf8(statePath(projectDir), `${JSON.stringify(state, null, 2)}\n`);
}

export async function workflowStatus(projectDir) {
  const state = await loadWorkflow(projectDir);
  return {
    currentStage: state.currentStage,
    profileHash: state.profileHash,
    stages: STAGE_ORDER.map((stage) => ({
      stage,
      ...state.stages[stage],
      policy: CRITIC_POLICY[stage],
    })),
  };
}

export async function createCriticPacket(projectDir, stage) {
  if (!CRITIC_POLICY[stage]) throw new Error(`unknown stage: ${stage}`);
  const state = await loadWorkflow(projectDir);
  const stageState = state.stages[stage];
  if (!stageState) throw new Error(`workflow does not contain stage: ${stage}`);
  const policy = CRITIC_POLICY[stage];
  const packet = {
    version: 1,
    stage,
    round: stageState.round,
    maxRounds: policy.maxRounds,
    requiredChannels: policy.channels,
    artifacts: policy.artifacts,
    requiredEvidence: policy.evidence,
    independence: 'Each channel must assess independently before synthesis. UX may not be judged from code alone.',
    outputContract: {
      stage,
      channel: '<one required channel>',
      round: stageState.round,
      method: '<independent|deterministic|browser|human>',
      verdict: '<pass|revise|block>',
      findings: [{
        severity: '<P0|P1|P2|P3>',
        title: '<specific problem>',
        evidence: '<observable evidence, file, screenshot, trace, test, or user quote>',
        impact: '<user, product, operational, or maintenance impact>',
        confidence: 0.0,
        requiresHumanDecision: false,
      }],
    },
  };
  const targetDir = reviewDir(projectDir, stage, stageState.round);
  await ensureDir(targetDir);
  await writeUtf8(path.join(targetDir, 'packet.json'), `${JSON.stringify(packet, null, 2)}\n`);
  stageState.status = 'in-review';
  await saveWorkflow(projectDir, state);
  return { packet, targetDir };
}

export async function recordCriticReport(projectDir, stage, channel, reportFile) {
  const state = await loadWorkflow(projectDir);
  const stageState = state.stages[stage];
  if (!stageState) throw new Error(`unknown stage: ${stage}`);
  const policy = CRITIC_POLICY[stage];
  if (!policy.channels.includes(channel)) throw new Error(`channel ${channel} is not required for ${stage}`);
  const report = JSON.parse(await readUtf8(reportFile));
  const validation = validateCriticReport(report, { stage, channel, round: stageState.round });
  if (!validation.ok) throw new Error(`critic report validation failed:\n- ${validation.errors.join('\n- ')}`);
  const targetDir = reviewDir(projectDir, stage, stageState.round);
  await ensureDir(targetDir);
  const target = path.join(targetDir, `${channel}.json`);
  await writeUtf8(target, `${JSON.stringify(report, null, 2)}\n`);
  stageState.reports[channel] = path.relative(projectDir, target);
  stageState.status = 'in-review';
  await saveWorkflow(projectDir, state);
  return { target, report };
}

async function loadCurrentReports(projectDir, stage, state) {
  const stageState = state.stages[stage];
  const policy = CRITIC_POLICY[stage];
  const missing = policy.channels.filter((channel) => !stageState.reports[channel]);
  if (missing.length) throw new Error(`missing critic channels for ${stage}: ${missing.join(', ')}`);
  const reports = [];
  for (const channel of policy.channels) {
    const reportPath = path.join(projectDir, stageState.reports[channel]);
    reports.push(JSON.parse(await readUtf8(reportPath)));
  }
  return reports;
}

export async function evaluateStage(projectDir, stage) {
  const state = await loadWorkflow(projectDir);
  const reports = await loadCurrentReports(projectDir, stage, state);
  const summary = summarizeCriticReports(reports);
  const stageState = state.stages[stage];
  stageState.decision = summary.decision;
  stageState.status = summary.decision === 'pass' ? 'review-passed' : summary.decision;
  const target = path.join(reviewDir(projectDir, stage, stageState.round), 'summary.json');
  await writeUtf8(target, `${JSON.stringify(summary, null, 2)}\n`);
  await saveWorkflow(projectDir, state);
  return summary;
}

export async function reviseStage(projectDir, stage) {
  const state = await loadWorkflow(projectDir);
  const stageState = state.stages[stage];
  const policy = CRITIC_POLICY[stage];
  if (!['revise', 'block'].includes(stageState.decision)) {
    throw new Error(`${stage} must have a revise or block decision before starting a new round`);
  }
  if (stageState.round >= policy.maxRounds) {
    stageState.status = 'human-escalation';
    await saveWorkflow(projectDir, state);
    throw new Error(`${stage} reached max critic rounds (${policy.maxRounds}); human decision required`);
  }
  stageState.round += 1;
  stageState.decision = null;
  stageState.reports = {};
  stageState.status = 'draft';
  await saveWorkflow(projectDir, state);
  return stageState;
}

export async function approveStage(projectDir, stage, approvedBy) {
  if (!approvedBy || approvedBy.trim() === '') throw new Error('--by is required');
  const state = await loadWorkflow(projectDir);
  const stageState = state.stages[stage];
  if (!stageState) throw new Error(`unknown stage: ${stage}`);
  if (stageState.decision !== 'pass') throw new Error(`${stage} cannot be approved until critic decision is pass`);
  stageState.approval = { status: 'approved', approvedBy, approvedAt: new Date().toISOString() };
  stageState.status = 'approved';
  const index = STAGE_ORDER.indexOf(stage);
  state.currentStage = STAGE_ORDER[index + 1] ?? 'complete';
  await saveWorkflow(projectDir, state);
  return { stage, approval: stageState.approval, nextStage: state.currentStage };
}

export async function workflowExists(projectDir) {
  return exists(statePath(projectDir)) && exists(policyPath(projectDir));
}
