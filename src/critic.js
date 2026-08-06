const SEVERITIES = new Set(['P0', 'P1', 'P2', 'P3']);
const VERDICTS = new Set(['pass', 'revise', 'block']);

function requireString(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${label} must be a non-empty string`);
}

export function validateCriticReport(report, expected = {}) {
  const errors = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { ok: false, errors: ['report must be an object'] };
  }
  requireString(report.stage, 'report.stage', errors);
  requireString(report.channel, 'report.channel', errors);
  requireString(report.method, 'report.method', errors);
  if (!Number.isInteger(report.round) || report.round < 1) errors.push('report.round must be a positive integer');
  if (!VERDICTS.has(report.verdict)) errors.push(`report.verdict must be one of ${[...VERDICTS].join(', ')}`);
  if (!Array.isArray(report.findings)) errors.push('report.findings must be an array');

  if (expected.stage && report.stage !== expected.stage) errors.push(`report.stage must be ${expected.stage}`);
  if (expected.channel && report.channel !== expected.channel) errors.push(`report.channel must be ${expected.channel}`);
  if (expected.round && report.round !== expected.round) errors.push(`report.round must be ${expected.round}`);

  for (const [index, finding] of (report.findings ?? []).entries()) {
    const prefix = `report.findings[${index}]`;
    if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!SEVERITIES.has(finding.severity)) errors.push(`${prefix}.severity must be P0, P1, P2, or P3`);
    requireString(finding.title, `${prefix}.title`, errors);
    requireString(finding.evidence, `${prefix}.evidence`, errors);
    requireString(finding.impact, `${prefix}.impact`, errors);
    if (typeof finding.confidence !== 'number' || finding.confidence < 0 || finding.confidence > 1) {
      errors.push(`${prefix}.confidence must be between 0 and 1`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function summarizeCriticReports(reports) {
  const findings = reports.flatMap((report) => report.findings ?? []);
  const counts = Object.fromEntries([...SEVERITIES].map((severity) => [
    severity,
    findings.filter((finding) => finding.severity === severity).length,
  ]));
  const blocking = reports.some((report) => report.verdict === 'block') || counts.P0 > 0;
  const needsRevision = blocking || reports.some((report) => report.verdict === 'revise') || counts.P1 > 0;
  return {
    decision: blocking ? 'block' : needsRevision ? 'revise' : 'pass',
    counts,
    findings,
    channels: reports.map((report) => report.channel),
  };
}
