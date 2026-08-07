import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { agentPreset, CRITIC_OUTPUT_SCHEMA, writeAgentConfig } from '../src/agent-config.js';
import { tempDir } from '../test-support/helpers.js';

test('Codex preset uses automatic review for the builder and read-only schema output for critics', () => {
  const root = path.resolve('/tmp/project');
  const preset = agentPreset('codex', root);
  assert.deepEqual(preset.builder.command.slice(0, 2), ['codex', 'exec']);
  assert.ok(preset.builder.command.includes('--approve-for-me'));
  assert.equal(preset.builder.command.includes('--dangerously-bypass-approvals-and-sandbox'), false);
  assert.ok(preset.critic.command.includes('read-only'));
  assert.ok(preset.critic.command.includes('--output-schema'));
  assert.equal(preset.critic.command.at(-1), '-');
});

test('agent init writes the Codex config and strict critic JSON schema', async () => {
  const root = await tempDir();
  const result = await writeAgentConfig(root, { provider: 'codex' });
  assert.equal(result.created, true);
  const config = JSON.parse(await readFile(result.path, 'utf8'));
  const schema = JSON.parse(await readFile(result.schemaPath, 'utf8'));
  assert.equal(config.provider, 'codex');
  assert.deepEqual(schema.required, CRITIC_OUTPUT_SCHEMA.required);
  assert.equal(schema.properties.verdict.enum.includes('block'), true);
  assert.equal(schema.properties.findings.items.additionalProperties, false);
});
