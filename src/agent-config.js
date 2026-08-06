import path from 'node:path';
import { exists, writeUtf8 } from './fs-utils.js';

export const CRITIC_OUTPUT_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['stage', 'channel', 'round', 'method', 'verdict', 'findings'],
  properties: {
    stage: { type: 'string', minLength: 1 },
    channel: { type: 'string', minLength: 1 },
    round: { type: 'integer', minimum: 1 },
    method: { type: 'string', minLength: 1 },
    verdict: { enum: ['pass', 'revise', 'block'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'title', 'evidence', 'impact', 'confidence', 'requiresHumanDecision'],
        properties: {
          severity: { enum: ['P0', 'P1', 'P2', 'P3'] },
          title: { type: 'string', minLength: 1 },
          evidence: { type: 'string', minLength: 1 },
          impact: { type: 'string', minLength: 1 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          requiresHumanDecision: { type: 'boolean' },
        },
      },
    },
  },
});

export function agentPreset(provider, projectDir = '.') {
  const root = path.resolve(projectDir);
  if (provider === 'codex') {
    const schemaPath = path.join(root, '.saasharness', 'critic-output.schema.json');
    return {
      provider: 'codex',
      schemaPath,
      builder: {
        command: [
          'codex', 'exec',
          '--ephemeral',
          '--skip-git-repo-check',
          '--approve-for-me',
          '--color', 'never',
          '-',
        ],
        input: 'stdin',
      },
      critic: {
        command: [
          'codex', 'exec',
          '--ephemeral',
          '--skip-git-repo-check',
          '--sandbox', 'read-only',
          '--color', 'never',
          '--output-schema', schemaPath,
          '-',
        ],
        input: 'stdin',
        output: 'json-stdout',
      },
      verification: true,
    };
  }
  return {
    provider: provider ?? 'external-agent-cli',
    schemaPath: null,
    builder: { command: ['__SET_BUILDER_COMMAND__'], input: 'stdin' },
    critic: { command: ['__SET_CRITIC_COMMAND__'], input: 'stdin', output: 'json-stdout' },
    verification: true,
  };
}

export async function writeAgentConfig(projectDir = '.', options = {}) {
  const root = path.resolve(projectDir);
  const target = path.resolve(options.path ?? path.join(root, '.saasharness', 'agent.json'));
  if (await exists(target) && !options.force) return { path: target, created: false };
  const config = { version: 1, ...agentPreset(options.provider ?? 'external-agent-cli', root) };
  if (config.schemaPath) {
    await writeUtf8(config.schemaPath, `${JSON.stringify(CRITIC_OUTPUT_SCHEMA, null, 2)}\n`);
  }
  const serializable = { ...config };
  delete serializable.schemaPath;
  await writeUtf8(target, `${JSON.stringify(serializable, null, 2)}\n`);
  return { path: target, created: true, config: serializable, schemaPath: config.schemaPath };
}
