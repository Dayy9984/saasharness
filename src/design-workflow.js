import path from 'node:path';
import { exists, readUtf8, writeUtf8 } from './fs-utils.js';

const catalogPath = (projectDir) => path.join(projectDir, 'src', 'react', 'ux-lab', 'theme-catalog.json');
const selectionYamlPath = (projectDir) => path.join(projectDir, 'artifacts', '02-ux', 'theme-selection.yml');
const selectionJsonPath = (projectDir) => path.join(projectDir, '.saasharness', 'theme-selection.json');
const selectionTsPath = (projectDir) => path.join(projectDir, 'src', 'react', 'ux-lab', 'theme-selection.ts');

function yamlString(value) {
  return JSON.stringify(String(value));
}

export async function readThemeCatalog(projectDir = '.') {
  const target = catalogPath(path.resolve(projectDir));
  if (!await exists(target)) throw new Error(`theme catalog not found: ${target}`);
  const catalog = JSON.parse(await readUtf8(target));
  if (!Array.isArray(catalog)) throw new Error('theme catalog must be an array');
  const ids = catalog.map((theme) => theme?.id).filter(Boolean);
  if (catalog.length !== 15 || new Set(ids).size !== 15) {
    throw new Error('theme catalog must contain exactly 15 uniquely identified variants');
  }
  for (const [index, theme] of catalog.entries()) {
    for (const field of ['id', 'name', 'thesis']) {
      if (typeof theme?.[field] !== 'string' || theme[field].trim() === '') {
        throw new Error(`theme catalog entry ${index} is missing ${field}`);
      }
    }
    if (!Array.isArray(theme.pinterestQueries) || theme.pinterestQueries.length === 0) {
      throw new Error(`theme ${theme.id} must include Pinterest research queries`);
    }
  }
  return catalog;
}

export async function designStatus(projectDir = '.') {
  const root = path.resolve(projectDir);
  const soul = await exists(path.join(root, 'SOUL.md'));
  let catalogCount = 0;
  let catalogValid = false;
  try {
    const catalog = await readThemeCatalog(root);
    catalogCount = catalog.length;
    catalogValid = true;
  } catch {
    catalogValid = false;
  }
  let selection = null;
  if (await exists(selectionJsonPath(root))) {
    selection = JSON.parse(await readUtf8(selectionJsonPath(root)));
  }
  return {
    soul,
    catalog: { valid: catalogValid, count: catalogCount, expected: 15 },
    selection,
    routes: {
      gallery: '/__ux/themes',
      prototype: '/__ux/prototype',
    },
  };
}

export async function selectTheme(projectDir, themeId, approvedBy) {
  if (!approvedBy || approvedBy.trim() === '') throw new Error('--by is required');
  const root = path.resolve(projectDir);
  if (!await exists(path.join(root, 'SOUL.md'))) {
    throw new Error('SOUL.md must exist and be reviewed before theme approval');
  }
  const catalog = await readThemeCatalog(root);
  const theme = catalog.find((candidate) => candidate.id === themeId);
  if (!theme) throw new Error(`unknown theme id: ${themeId}`);
  const approvedAt = new Date().toISOString();
  const selection = {
    version: 1,
    status: 'approved',
    themeId: theme.id,
    themeName: theme.name,
    approvedBy,
    approvedAt,
    soul: 'SOUL.md',
    catalog: 'src/react/ux-lab/theme-catalog.json',
  };
  const yaml = `version: 1\nstatus: approved\ntheme_id: ${yamlString(theme.id)}\ntheme_name: ${yamlString(theme.name)}\napproved_by: ${yamlString(approvedBy)}\napproved_at: ${yamlString(approvedAt)}\nsoul: SOUL.md\ncatalog: src/react/ux-lab/theme-catalog.json\n`;
  await writeUtf8(selectionYamlPath(root), yaml);
  await writeUtf8(selectionJsonPath(root), `${JSON.stringify(selection, null, 2)}\n`);
  await writeUtf8(selectionTsPath(root), `export const approvedThemeId = ${JSON.stringify(theme.id)} as const;\n`);
  return selection;
}
