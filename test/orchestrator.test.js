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
  requiredEvidence: ['running React theme gallery'],
  artifacts: ['SOUL.md', 'artifacts/02-ux/theme-candidates.yml'],
};

test('UX workflow separates philosophy, themes, and mock-data prototype', () => {
  assert.deepEqual(STAGE_RECIPES.discovery.upstreams, ['spec-kit']);
  assert.ok(STAGE_RECIPES['ux-philosophy'].upstreams.includes('open-design'));
  assert.match(STAGE_RECIPES['ux-themes'].objective, /15 materially distinct/i);
  assert.match(STAGE_RECIPES['ux-prototype'].objective, /mock data/i);
  assert.ok(STAGE_RECIPES.implementation.upstreams.includes('superpowers'));
});

test('theme-stage prompt prohibits scraping and requires a comparable gallery', () => {
  const prompt = buildStagePrompt('ux-themes', { projectDir: '/tmp/project', round: 1 });
  assert.match(prompt, /exactly 15/i);
  assert.match(prompt, /Do not automate Pinterest scraping/i);
  assert.match(prompt, /same neutral content skeleton/i);
  assert.match(prompt, /Do not approve the stage/);
});

test('critic prompts are isolated and JSON-only', () => {
  const prompt = buildCriticPrompt('ux-themes', 'browser-evidence', packet, { projectDir: '/tmp/project' });
  assert.match(prompt, /isolated browser-evidence critic/);
  assert.match(prompt, /Return exactly one JSON object and no prose/);
  assert.match(prompt, /running React theme gallery/);
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

test('all UX stages and implementation include browser journeys', () => {
  for (const stage of ['ux-philosophy', 'ux-themes', 'ux-prototype']) {
    assert.ok(stageVerificationPlan(stage).some(([bin, args]) => bin === 'npm' && args.includes('test:e2e')));
  }
  assert.ok(stageVerificationPlan('implementation').some(([bin, args]) => bin === 'npm' && args.includes('test:e2e')));
});
