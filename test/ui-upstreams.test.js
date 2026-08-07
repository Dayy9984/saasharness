import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tempDir } from '../test-support/helpers.js';
import { installPinnedUiSkills } from '../src/ui-upstreams.js';

async function file(root, relativePath, content = relativePath) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

test('pinned anti-slop and coss skills are copied without repository metadata', async () => {
  const root = await tempDir('saasharness-ui-upstreams-');
  const sources = path.join(root, '.saasharness', 'sources');

  await file(path.join(sources, 'no-slop-ui'), 'SKILL.md', '# no slop');
  await file(path.join(sources, 'no-slop-ui'), 'references/banned-patterns.md', '# banned');
  await file(path.join(sources, 'no-slop-ui'), 'examples/review-checklist.md', '# review');
  await file(path.join(sources, 'no-slop-ui'), 'LICENSE', 'MIT no slop');

  await file(path.join(sources, 'uizze-anti-slop'), 'skills/anti-ui-slop/SKILL.md', '# anti ui slop');
  await file(path.join(sources, 'uizze-anti-slop'), 'LICENSE', 'MIT uizze');

  await file(path.join(sources, 'praeclarum-ui'), 'UI.md', '# expected behavior');
  await file(path.join(sources, 'praeclarum-ui'), 'LICENSE', 'MIT ui');

  await file(path.join(sources, 'frontend-no-slop'), '.agents/skills/frontend-no-slop/SKILL.md', '# frontend no slop');
  await file(path.join(sources, 'frontend-no-slop'), '.agents/skills/frontend-no-slop/registry/forbidden-slop.json', '{}');
  await file(path.join(sources, 'frontend-no-slop'), 'LICENSE', 'MIT frontend');

  await file(path.join(sources, 'coss-ui'), 'apps/ui/skills/coss/SKILL.md', '# coss');
  await file(path.join(sources, 'coss-ui'), 'apps/ui/skills/coss/references/cli.md', '# cli');
  await file(path.join(sources, 'coss-ui'), 'LICENSING.md', 'apps/ui MIT');

  const manifest = await installPinnedUiSkills(root);
  assert.equal(manifest.installed.length, 5);
  assert.match(
    await readFile(path.join(root, '.agents/skills/no-slop-ui/SKILL.md'), 'utf8'),
    /no slop/,
  );
  assert.match(
    await readFile(path.join(root, '.agents/skills/anti-ui-slop/SKILL.md'), 'utf8'),
    /anti ui slop/,
  );
  assert.match(
    await readFile(path.join(root, '.agents/skills/ui-principles/SKILL.md'), 'utf8'),
    /Read `UI.md`/,
  );
  assert.match(
    await readFile(path.join(root, '.agents/skills/frontend-no-slop/registry/forbidden-slop.json'), 'utf8'),
    /\{\}/,
  );
  assert.match(
    await readFile(path.join(root, '.agents/skills/coss/references/cli.md'), 'utf8'),
    /cli/,
  );
  const saved = JSON.parse(await readFile(path.join(root, '.saasharness/ui-upstreams.json'), 'utf8'));
  assert.equal(saved.precedence[0], 'approved product and UX contracts');
  assert.match(saved.exceptionPolicy, /localized treatment/);
});
