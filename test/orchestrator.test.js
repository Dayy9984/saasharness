import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGE_RECIPES,
  buildCriticPrompt,
  buildStagePrompt,
  expandCommand,
  parseJsonOutput,
  stageVerificationPlan,
} from '../src/orchestrator.js';

const packet = {
  round: 1,
  requiredEvidence: ['running React mock'],
  artifacts: ['artifacts/02-ux/ia.md'],
};

test('stage recipes delegate generic work to agreed upstream repositories', () => {
  assert.deepEqual(STAGE_RECIPES.discovery.upstreams, ['spec-kit']);
  assert.ok(STAGE_RECIPES['ux-ia'].upstreams.includes('open-design'));
  assert.ok(STAGE_RECIPES['ux-ia'].upstreams.includes('impeccable'));
  assert.ok(STAGE_RECIPES.implementation.upstreams.includes('superpowers'));
  assert.ok(STAGE_RECIPES.architecture.upstreams.includes('cloudflare-react-template'));
});

test('stage prompts require actual modification and preserve human approval', () => {
  const prompt = buildStagePrompt('plan', { projectDir: '/tmp/project', round: 1 });
  assert.match(prompt, /Spec Kit tasks are canonical/);
  assert.match(prompt, /Modify the project and artifacts/);
  assert.match(prompt, /Do not approve the stage/);
});

test('critic prompts are isolated and JSON-only', () => {
  const prompt = buildCriticPrompt('ux-ia', 'browser-evidence', packet, { projectDir: '/tmp/project' });
  assert.match(prompt, /isolated browser-evidence critic/);
  assert.match(prompt, /Return exactly one JSON object and no prose/);
  assert.match(prompt, /running React mock/);
});

test('command expansion is argv-based and supports stage placeholders', () => {
  const command = expandCommand(['agent', '--cwd', '{project}', '--stage', '{stage}', '{prompt}'], {
    project: '/tmp/project', stage: 'implementation', prompt: '/tmp/prompt.md', round: '1', channel: '', output: '',
  });
  assert.deepEqual(command, ['agent', '--cwd', '/tmp/project', '--stage', 'implementation', '/tmp/prompt.md']);
});

test('critic JSON parser accepts raw, fenced, and wrapped output', () => {
  assert.deepEqual(parseJsonOutput('{"verdict":"pass"}'), { verdict: 'pass' });
  assert.deepEqual(parseJsonOutput('```json\n{"verdict":"revise"}\n```'), { verdict: 'revise' });
  assert.deepEqual(parseJsonOutput('result follows\n{"verdict":"block"}\ndone'), { verdict: 'block' });
});

test('UX and implementation verification include browser journeys', () => {
  assert.ok(stageVerificationPlan('ux-ia').some(([bin, args]) => bin === 'npm' && args.includes('test:e2e')));
  assert.ok(stageVerificationPlan('implementation').some(([bin, args]) => bin === 'npm' && args.includes('test:e2e')));
});
