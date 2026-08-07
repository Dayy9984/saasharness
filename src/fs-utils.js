import { mkdir, readFile, writeFile, access, cp, rm } from 'node:fs/promises';
import path from 'node:path';

export async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function readUtf8(filePath) {
  return readFile(filePath, 'utf8');
}

export async function writeUtf8(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, 'utf8');
}

export async function writeFiles(rootDir, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    await writeUtf8(path.join(rootDir, relativePath), content);
  }
}

export async function prepareOutput(outDir, force = false) {
  if (await exists(outDir)) {
    if (!force) {
      throw new Error(`output already exists: ${outDir}. Pass --force to replace it.`);
    }
    await rm(outDir, { recursive: true, force: true });
  }
  await ensureDir(outDir);
}

export async function copyFile(source, destination) {
  await ensureDir(path.dirname(destination));
  await cp(source, destination);
}

export async function copyDirectory(source, destination) {
  await ensureDir(path.dirname(destination));
  await cp(source, destination, { recursive: true });
}
