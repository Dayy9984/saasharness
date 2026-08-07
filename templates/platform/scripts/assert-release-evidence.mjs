import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const target = process.argv[2] ?? 'staging';
if (!['staging', 'production'].includes(target)) {
  throw new Error('target must be staging or production');
}
const root = process.cwd();
const plan = JSON.parse(await readFile(path.join(root, '.saasharness', 'plan.json'), 'utf8'));
const evidence = JSON.parse(await readFile(path.join(root, '.saasharness', 'release-evidence.json'), 'utf8'));
if (plan.profileHash !== evidence.profileHash) throw new Error('release evidence profileHash does not match the assembled plan');
if (plan.codeReady !== true || evidence.codeReady !== true) throw new Error('selected product profile is not codeReady');

if (target === 'production') {
  const incomplete = evidence.required.filter((item) => item.status !== 'passed' || !item.source);
  if (incomplete.length) throw new Error(`production evidence incomplete: ${incomplete.map((item) => item.id).join(', ')}`);
  if (!evidence.productionApproval?.approvedBy || !evidence.productionApproval?.evidenceDigest) {
    throw new Error('production has not received explicit human release approval');
  }
  for (const item of evidence.required) {
    if (/^[a-z]+:\/\//i.test(item.source)) continue;
    await access(path.resolve(root, item.source)).catch(() => {
      throw new Error(`release evidence source is missing: ${item.id} -> ${item.source}`);
    });
  }
}

console.log(JSON.stringify({
  target,
  profileHash: plan.profileHash,
  codeReady: true,
  requiredEvidence: evidence.required.length,
  productionApproval: evidence.productionApproval,
}, null, 2));
