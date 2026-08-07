import path from 'node:path';
import { exists, readUtf8, writeUtf8 } from './fs-utils.js';

const evidencePath = (projectDir) => path.join(projectDir, '.saasharness', 'release-evidence.json');
const approvalPath = (projectDir) => path.join(projectDir, 'src', 'generated', 'release-approval.ts');

export function evidenceId(label) {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function initialReleaseEvidence(plan) {
  return {
    version: 1,
    profileHash: plan.profileHash,
    codeReady: plan.codeReady === true,
    required: [...new Set(plan.releaseEvidence ?? [])].map((label) => ({
      id: evidenceId(label),
      label,
      status: 'pending',
      source: null,
      recordedBy: null,
      recordedAt: null,
      note: null,
    })),
    productionApproval: null,
  };
}

export function releaseApprovalSource(input = {}) {
  return `export const releaseApproval = ${JSON.stringify({
    productionReady: input.productionReady === true,
    profileHash: input.profileHash ?? null,
    approvedBy: input.approvedBy ?? null,
    approvedAt: input.approvedAt ?? null,
    evidenceDigest: input.evidenceDigest ?? null,
  }, null, 2)} as const;\n`;
}

export async function loadReleaseEvidence(projectDir = '.') {
  const target = evidencePath(path.resolve(projectDir));
  if (!await exists(target)) throw new Error(`release evidence not found: ${target}`);
  return JSON.parse(await readUtf8(target));
}

export async function releaseEvidenceStatus(projectDir = '.') {
  const evidence = await loadReleaseEvidence(projectDir);
  const counts = evidence.required.reduce((result, item) => {
    result[item.status] = (result[item.status] ?? 0) + 1;
    return result;
  }, {});
  return {
    ...evidence,
    counts,
    allPassed: evidence.codeReady === true && evidence.required.every((item) => item.status === 'passed'),
  };
}

async function validateSource(projectDir, source) {
  if (!source || source.trim() === '') throw new Error('--source is required');
  if (/^https?:\/\//i.test(source) || /^[a-z]+:\/\//i.test(source)) return source;
  const resolved = path.resolve(projectDir, source);
  if (!await exists(resolved)) throw new Error(`evidence source does not exist: ${resolved}`);
  return path.relative(projectDir, resolved) || '.';
}

export async function recordReleaseEvidence(projectDir, id, input = {}) {
  const root = path.resolve(projectDir);
  const status = input.status ?? 'passed';
  if (!['pending', 'passed', 'failed'].includes(status)) {
    throw new Error('release evidence status must be pending, passed, or failed');
  }
  if (!input.recordedBy || input.recordedBy.trim() === '') throw new Error('--by is required');
  const evidence = await loadReleaseEvidence(root);
  if (evidence.productionApproval) throw new Error('production release is already approved; create a new change/release record');
  const item = evidence.required.find((candidate) => candidate.id === id || candidate.label === id);
  if (!item) {
    throw new Error(`unknown release evidence id: ${id}. Expected one of ${evidence.required.map((candidate) => candidate.id).join(', ')}`);
  }
  item.status = status;
  item.source = status === 'pending' ? null : await validateSource(root, input.source);
  item.recordedBy = input.recordedBy;
  item.recordedAt = new Date().toISOString();
  item.note = input.note ?? null;
  await writeUtf8(evidencePath(root), `${JSON.stringify(evidence, null, 2)}\n`);
  return item;
}

function stableEvidenceDigest(evidence) {
  const canonical = evidence.required
    .map(({ id, label, status, source, recordedBy, recordedAt }) => ({ id, label, status, source, recordedBy, recordedAt }))
    .sort((left, right) => left.id.localeCompare(right.id));
  let hash = 2166136261;
  const text = JSON.stringify({ profileHash: evidence.profileHash, required: canonical });
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function approveProductionRelease(projectDir, approvedBy) {
  const root = path.resolve(projectDir);
  if (!approvedBy || approvedBy.trim() === '') throw new Error('--by is required');
  const evidence = await loadReleaseEvidence(root);
  if (evidence.codeReady !== true) throw new Error('selected product profile is not codeReady');
  const incomplete = evidence.required.filter((item) => item.status !== 'passed' || !item.source);
  if (incomplete.length) {
    throw new Error(`release evidence is incomplete: ${incomplete.map((item) => item.id).join(', ')}`);
  }
  const approvedAt = new Date().toISOString();
  const evidenceDigest = stableEvidenceDigest(evidence);
  evidence.productionApproval = { approvedBy, approvedAt, evidenceDigest };
  await writeUtf8(evidencePath(root), `${JSON.stringify(evidence, null, 2)}\n`);
  await writeUtf8(approvalPath(root), releaseApprovalSource({
    productionReady: true,
    profileHash: evidence.profileHash,
    approvedBy,
    approvedAt,
    evidenceDigest,
  }));
  return evidence.productionApproval;
}
