import path from 'node:path';
import {
  approveProductionRelease,
  loadReleaseEvidence,
  recordReleaseEvidence,
  releaseEvidenceStatus,
} from './release-evidence.js';
import {
  approveStage,
  loadWorkflow,
  saveWorkflow,
} from './workflow.js';
import {
  exists,
  readUtf8,
  removePath,
  writeUtf8,
} from './fs-utils.js';

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export async function runReleaseCommand(args) {
  const [action, projectDir, evidenceId] = args;
  if (!projectDir) throw new Error(`release ${action ?? '<action>'} requires a project directory`);
  if (action === 'status') {
    console.log(JSON.stringify(await releaseEvidenceStatus(projectDir), null, 2));
    return;
  }
  if (action === 'record') {
    if (!evidenceId) throw new Error('release record requires <project-directory> <evidence-id>');
    const recordedBy = option(args, '--by');
    const source = option(args, '--source');
    const status = option(args, '--status') ?? 'passed';
    const note = option(args, '--note') ?? null;
    console.log(JSON.stringify(await recordReleaseEvidence(projectDir, evidenceId, {
      recordedBy,
      source,
      status,
      note,
    }), null, 2));
    return;
  }
  throw new Error(`unknown release action: ${action ?? '<missing>'}`);
}

export async function approveReleaseStage(projectDir, approvedBy) {
  const root = path.resolve(projectDir);
  if (!approvedBy || approvedBy.trim() === '') throw new Error('--by is required');
  const status = await releaseEvidenceStatus(root);
  if (!status.allPassed) {
    const incomplete = status.required
      .filter((item) => item.status !== 'passed' || !item.source)
      .map((item) => item.id);
    throw new Error(`release evidence is incomplete: ${incomplete.join(', ')}`);
  }

  const workflowBefore = await loadWorkflow(root);
  const releaseState = workflowBefore.stages?.release;
  if (workflowBefore.currentStage !== 'release') {
    throw new Error(`current workflow stage is ${workflowBefore.currentStage}; refusing release approval`);
  }
  if (releaseState?.decision !== 'pass') {
    throw new Error('release cannot be approved until release critics pass');
  }

  const evidencePath = path.join(root, '.saasharness', 'release-evidence.json');
  const approvalPath = path.join(root, 'src', 'generated', 'release-approval.ts');
  const evidenceBefore = await loadReleaseEvidence(root);
  const approvalExisted = await exists(approvalPath);
  const approvalBefore = approvalExisted ? await readUtf8(approvalPath) : null;

  try {
    const workflowApproval = await approveStage(root, 'release', approvedBy);
    const productionApproval = await approveProductionRelease(root, approvedBy);
    return { workflowApproval, productionApproval };
  } catch (error) {
    await saveWorkflow(root, workflowBefore);
    await writeUtf8(evidencePath, `${JSON.stringify(evidenceBefore, null, 2)}\n`);
    if (approvalBefore !== null) await writeUtf8(approvalPath, approvalBefore);
    else await removePath(approvalPath);
    throw error;
  }
}
