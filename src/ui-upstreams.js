import path from 'node:path';
import {
  copyDirectory,
  copyFile,
  ensureDir,
  exists,
  removePath,
  writeUtf8,
} from './fs-utils.js';
import { upstreamSourcePath } from './upstream-workspace.js';

const SKILLS_ROOT = path.join('.agents', 'skills');

async function requirePath(source, label) {
  if (!await exists(source)) {
    throw new Error(`pinned UI upstream is incomplete for ${label}: ${source}`);
  }
}

async function copyDirectoryClean(source, destination, label) {
  await requirePath(source, label);
  await removePath(destination);
  await copyDirectory(source, destination);
}

async function copyFileChecked(source, destination, label) {
  await requirePath(source, label);
  await copyFile(source, destination);
}

export const UI_SKILL_INSTALLS = Object.freeze([
  'no-slop-ui',
  'uizze-anti-slop',
  'praeclarum-ui',
  'frontend-no-slop',
  'coss-ui',
]);

export async function installPinnedUiSkills(projectDir = '.') {
  const root = path.resolve(projectDir);
  const skillsRoot = path.join(root, SKILLS_ROOT);
  const licenseRoot = path.join(root, '.saasharness', 'licenses');
  await ensureDir(skillsRoot);
  await ensureDir(licenseRoot);

  const installed = [];

  {
    const source = upstreamSourcePath(root, 'no-slop-ui');
    const destination = path.join(skillsRoot, 'no-slop-ui');
    await removePath(destination);
    await ensureDir(destination);
    await copyFileChecked(path.join(source, 'SKILL.md'), path.join(destination, 'SKILL.md'), 'no-slop-ui/SKILL.md');
    await copyDirectoryClean(path.join(source, 'references'), path.join(destination, 'references'), 'no-slop-ui/references');
    await ensureDir(path.join(destination, 'examples'));
    await copyFileChecked(
      path.join(source, 'examples', 'review-checklist.md'),
      path.join(destination, 'examples', 'review-checklist.md'),
      'no-slop-ui review checklist',
    );
    await copyFileChecked(path.join(source, 'LICENSE'), path.join(licenseRoot, 'no-slop-ui-MIT.txt'), 'no-slop-ui license');
    installed.push({ name: 'no-slop-ui', destination: path.relative(root, destination) });
  }

  {
    const source = upstreamSourcePath(root, 'uizze-anti-slop');
    const destination = path.join(skillsRoot, 'anti-ui-slop');
    await copyDirectoryClean(path.join(source, 'skills', 'anti-ui-slop'), destination, 'uizze anti-ui-slop skill');
    await copyFileChecked(path.join(source, 'LICENSE'), path.join(licenseRoot, 'uizze-MIT.txt'), 'uizze license');
    installed.push({ name: 'uizze-anti-slop', destination: path.relative(root, destination) });
  }

  {
    const source = upstreamSourcePath(root, 'praeclarum-ui');
    const destination = path.join(skillsRoot, 'ui-principles');
    await removePath(destination);
    await ensureDir(destination);
    await copyFileChecked(path.join(source, 'UI.md'), path.join(destination, 'UI.md'), 'praeclarum UI.md');
    await copyFileChecked(path.join(source, 'LICENSE'), path.join(licenseRoot, 'praeclarum-ui-MIT.txt'), 'praeclarum UI license');
    await writeUtf8(path.join(destination, 'SKILL.md'), `---
name: ui-principles
description: Apply the pinned praeclarum UI.md rules for predictable behavior, user control, task completion, recovery, and familiar interaction models.
license: MIT
---

# UI Principles

Read \`UI.md\` in this directory before designing, implementing, or reviewing any visible interface.

These rules are mandatory unless an explicit product requirement conflicts. They take precedence over decorative novelty and must be evaluated together with \`no-slop-ui\`, \`anti-ui-slop\`, \`frontend-no-slop\`, the approved \`SOUL.md\`, and the product's existing design system.
`);
    installed.push({ name: 'praeclarum-ui', destination: path.relative(root, destination) });
  }

  {
    const source = upstreamSourcePath(root, 'frontend-no-slop');
    const destination = path.join(skillsRoot, 'frontend-no-slop');
    await copyDirectoryClean(
      path.join(source, '.agents', 'skills', 'frontend-no-slop'),
      destination,
      'frontend-no-slop canonical skill',
    );
    await copyFileChecked(path.join(source, 'LICENSE'), path.join(licenseRoot, 'frontend-no-slop-MIT.txt'), 'frontend-no-slop license');
    installed.push({ name: 'frontend-no-slop', destination: path.relative(root, destination) });
  }

  {
    const source = upstreamSourcePath(root, 'coss-ui');
    const destination = path.join(skillsRoot, 'coss');
    await copyDirectoryClean(path.join(source, 'apps', 'ui', 'skills', 'coss'), destination, 'coss MIT UI skill');
    await copyFileChecked(path.join(source, 'LICENSING.md'), path.join(licenseRoot, 'coss-LICENSING.md'), 'coss licensing boundary');
    installed.push({
      name: 'coss-ui',
      destination: path.relative(root, destination),
      sourceBoundary: 'apps/ui only (MIT)',
    });
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    precedence: [
      'approved product and UX contracts',
      'ui-principles',
      'frontend-no-slop page lens',
      'no-slop-ui banned defaults',
      'anti-ui-slop product-specific finish gate',
      'coss documented primitives and particles',
      'Impeccable rendered critique',
    ],
    exceptionPolicy: 'An explicit, human-approved SOUL.md exception may permit a localized treatment such as Apple-style glass controls; it never permits generic full-screen glassmorphism or decorative slop.',
    installed,
  };
  await writeUtf8(
    path.join(root, '.saasharness', 'ui-upstreams.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}
