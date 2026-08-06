import test from 'node:test';
import assert from 'node:assert/strict';
import { routeRisk } from '../src/risk-router.js';

test('CSS changes do not invoke money-path checks', () => {
  const result = routeRisk(['src/ui/styles.css']);
  assert.equal(result.risk, 'medium');
  assert.equal(result.checks.includes('race'), false);
  assert.equal(result.checks.includes('database-invariants'), false);
});

test('billing changes always route to critical checks', () => {
  const result = routeRisk(['src/modules/billing/public.ts']);
  assert.equal(result.risk, 'critical');
  assert.ok(result.checks.includes('replay'));
  assert.ok(result.checks.includes('race'));
});
