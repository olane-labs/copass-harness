#!/usr/bin/env node
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const harnessRoot = resolve(pkgRoot, '..', '..', '..');
const specSource = join(harnessRoot, 'spec', 'management', 'v1');
const specDest = join(pkgRoot, 'dist', 'specs', 'v1');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(specSource))) {
  console.error(`copy-spec: source not found: ${specSource}`);
  process.exit(1);
}

await rm(specDest, { recursive: true, force: true });
await mkdir(specDest, { recursive: true });

const entries = await readdir(specSource, { withFileTypes: true });
let copied = 0;
for (const entry of entries) {
  if (entry.name === 'prompts') continue;
  const src = join(specSource, entry.name);
  const dst = join(specDest, entry.name);
  await cp(src, dst, { recursive: true });
  copied += 1;
}
console.log(`copy-spec: copied ${copied} entries from ${specSource} → ${specDest}`);
