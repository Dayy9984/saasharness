import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCriticReport, summarizeCriticReports } from '../src/critic.js';

const report = {
  stage: 'discovery',
  channel: 'intent',
  round: 1,
  method: 'independent',
  verdict: 'pass',
  findings: [],
};

test('critic report validates against expected channel', () => {
  assert.equal(validateCriticReport(report, { stage: 'discovery', channel: 'intent', round: 1 }).ok, true);
});

test('P1 finding requires revision', () => {
  const summary = summarizeCriticReports([
    report,
    { ...report, channel: 'requirements', verdict: 'pass', findings: [{ severity: 'P1', title: 'Missing refund policy', evidence: 'PRD section empty', impact: 'Payment disputes', confidence: 0.9 }] },
  ]);
  assert.equal(summary.decision, 'revise');
});
