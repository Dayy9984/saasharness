import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  UPSTREAM_PROFILES,
  cloneUrl,
  isSyncableUpstream,
  selectUpstreams,
  upstreamClonePlan,
  upstreamSourcePath,
} from '../src/upstream-workspace.js';

const lock = {
  upstreams: {
    'cloudflare-react-template': { repository: 'cloudflare/templates', ref: 'a'.repeat(40), license: 'Apache-2.0' },
    'spec-kit': { repository: 'github/spec-kit', ref: 'b'.repeat(40), license: 'MIT' },
    'ui-ux-pro-max': { repository: 'example/review', ref: 'c'.repeat(40), license: 'REVIEW_REQUIRED' },
    'agent-startup-kit': { repository: 'example/missing', license: 'UNKNOWN', mode: 'not-integrated-source-unavailable' },
  },
};

test('core profile is an upstream-composed product base', () => {
  for (const required of ['cloudflare-react-template', 'spec-kit', 'superpowers', 'open-design', 'impeccable', 'ai-saas-starter']) {
    assert.ok(UPSTREAM_PROFILES.core.includes(required), required);
  }
});

test('selection rejects unverified or license-blocked repositories', () => {
  const selected = selectUpstreams(lock, { profile: 'all' }).map((item) => item.name);
  assert.deepEqual(selected, ['cloudflare-react-template', 'spec-kit']);
  assert.equal(isSyncableUpstream(lock.upstreams['ui-ux-pro-max']), false);
  assert.equal(isSyncableUpstream(lock.upstreams['agent-startup-kit']), false);
});

test('clone plan pins the exact GitHub commit without using shell strings', () => {
  const workspace = path.resolve('/tmp/example-project');
  const upstream = { name: 'spec-kit', ...lock.upstreams['spec-kit'] };
  const plan = upstreamClonePlan(workspace, upstream);
  assert.equal(plan.target, upstreamSourcePath(workspace, 'spec-kit'));
  assert.equal(plan.initialize[1][1].at(-1), cloneUrl('github/spec-kit'));
  assert.deepEqual(plan.refresh[1][1].slice(-2), ['origin', 'b'.repeat(40)]);
  assert.equal(plan.refresh[2][1].at(-1), 'FETCH_HEAD');
});
