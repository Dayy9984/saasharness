const RANK = { low: 0, medium: 1, high: 2, critical: 3 };

const RULES = [
  { risk: 'critical', pattern: /(^|\/)(auth|identity|permission|privacy|billing|payment|credits?|ledger|webhooks?|migrations?)(\/|\.|$)/i },
  { risk: 'high', pattern: /(^|\/)(api|worker|domain|jobs?|queues?|repositories?|contracts?)(\/|\.|$)/i },
  { risk: 'medium', pattern: /(^|\/)(ui|components?|styles?|motion|routes?|forms?)(\/|\.|$)|\.(css|scss|tsx)$/i },
  { risk: 'low', pattern: /(^|\/)(docs?|copy|assets?)(\/|\.|$)|\.(md|txt|svg|png|jpg)$/i },
];

const CHECKS = {
  low: ['format', 'changed-file-lint', 'preview-smoke'],
  medium: ['format', 'typecheck', 'related-tests', 'targeted-browser-smoke', 'a11y-smoke'],
  high: ['format', 'typecheck', 'unit', 'integration', 'contract', 'recovery-journey'],
  critical: ['format', 'typecheck', 'unit', 'integration', 'contract', 'database-invariants', 'replay', 'race', 'recovery', 'high-risk-review'],
};

export function classifyPath(filePath) {
  return RULES.find((rule) => rule.pattern.test(filePath))?.risk ?? 'high';
}

export function routeRisk(paths) {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error('risk routing requires at least one changed path');
  const classifications = paths.map((filePath) => ({ path: filePath, risk: classifyPath(filePath) }));
  const risk = classifications.reduce((highest, item) => RANK[item.risk] > RANK[highest] ? item.risk : highest, 'low');
  return { risk, checks: CHECKS[risk], classifications };
}
