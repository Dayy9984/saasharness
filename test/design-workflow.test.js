import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { assembleProject } from '../src/assembler.js';
import { designStatus, readThemeCatalog, selectTheme } from '../src/design-workflow.js';
import { tempDir, writeContracts } from '../test-support/helpers.js';

test('generated UX lab contains exactly fifteen unique design-only themes', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const output = path.join(root, 'generated');
  await writeContracts(contracts);
  await assembleProject(contracts, output);
  const themes = await readThemeCatalog(output);
  assert.equal(themes.length, 15);
  assert.equal(new Set(themes.map((theme) => theme.id)).size, 15);
  assert.ok(themes.every((theme) => theme.pinterestQueries.length > 0));
  await access(path.join(output, 'SOUL.md'));
});

test('production theme selection rejects unreviewed Pinterest evidence', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const output = path.join(root, 'generated');
  await writeContracts(contracts);
  await assembleProject(contracts, output);
  await assert.rejects(
    () => selectTheme(output, 'neon-arcade', 'owner'),
    /human-reviewed|at least five traceable Pinterest URLs/,
  );
});

test('pilot theme selection is explicit, human-attributed, and source controlled without claiming live research', async () => {
  const root = await tempDir();
  const contracts = path.join(root, 'contracts');
  const output = path.join(root, 'generated');
  await writeContracts(contracts);
  await assembleProject(contracts, output);
  const before = await designStatus(output);
  assert.equal(before.selection, null);
  const result = await selectTheme(output, 'neon-arcade', 'owner', { pilot: true });
  assert.equal(result.themeId, 'neon-arcade');
  assert.equal(result.status, 'pilot-approved');
  const selection = await readFile(path.join(output, 'src/react/ux-lab/theme-selection.ts'), 'utf8');
  assert.match(selection, /neon-arcade/);
});
