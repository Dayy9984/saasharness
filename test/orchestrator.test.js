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
  requiredEvidence: ['running React UI treatment gallery'],
  artifacts: ['SOUL.md', 'src/react/ux-lab/theme-catalog.json'],
};

test('UX workflow separates the lightweight foundation, treatment comparison, and mock-data prototype', () => {
  assert.deepEqual(STAGE_RECIPES.discovery.upstreams, ['spec-kit']);
  assert.ok(STAGE_RECIPES['ux-philosophy'].upstreams.includes('open-design'));
  assert.match(STAGE_RECIPES['ux-themes'].objective, /15 practical component-treatment variants/i);
  assert.match(STAGE_RECIPES['ux-prototype'].objective, /mock data/i);
  assert.ok(STAGE_RECIPES.implementation.upstreams.includes('superpowers'));
});

test('treatment-stage prompt prohibits scraping and preserves the same IA', () => {
  const prompt = buildStagePrompt('ux-themes', { projectDir: '/tmp/project', round: 1 });
  assert.match(prompt, /exactly 15/i);
  assert.match(prompt, /Do not automate Pinterest scraping/i);
  assert.match(prompt, /same IA, layout, neutral content skeleton, and user flow/i);
  assert.match(prompt, /Do not approve the stage/);
});

test('critic prompts are isolated and JSON-only', () => {
  const prompt = buildCriticPrompt('ux-themes', 'browser-evidence', packet, { projectDir: '/tmp/project' });
  assert.match(prompt, /isolated browser-evidence critic/);
  assert.match(prompt, /Return exactly one JSON object and no prose/);
  assert.match(prompt, /running React UI treatment gallery/);
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

test('UX foundation avoids a browser gate while treatment and prototype keep lightweight browser smoke', () => {
  assert.equal(stageVerificationPlan('ux-philosophy').some(([bin, args]) => bin === 'npm' && args.includes('test:e2e')), false);
  for (const stage of ['ux-themes', 'ux-prototype']) {
    assert.ok(stageVerificationPlan(stage).some(([bin, args]) => bin === 'npm' && args.includes('test:e2e')));
  }
  assert.ok(stageVerificationPlan('implementation').some(([bin, args]) => bin === 'npm' && args.includes('test:e2e')));
});
