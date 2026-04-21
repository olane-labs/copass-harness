#!/usr/bin/env node
import { cp, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = `Usage: npx create-copass-agent <project-name>

Scaffolds a Hono + Vercel AI SDK + Claude agent pre-wired with
@copass/core and @copass/ai-sdk. Edit the system prompt and deploy.`;

function slugify(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function main(): Promise<void> {
  const [nameArg, ...rest] = process.argv.slice(2);

  if (!nameArg || nameArg === '--help' || nameArg === '-h' || rest.length > 0) {
    process.stdout.write(USAGE + '\n');
    process.exit(nameArg === '--help' || nameArg === '-h' ? 0 : 1);
  }

  const pkgName = slugify(nameArg);
  if (!pkgName) {
    process.stderr.write(`Error: "${nameArg}" is not a valid project name.\n`);
    process.exit(1);
  }

  const dest = resolve(process.cwd(), nameArg);

  if (existsSync(dest)) {
    process.stderr.write(`Error: directory "${nameArg}" already exists.\n`);
    process.exit(1);
  }

  // Template sits alongside dist/ inside the published package.
  const here = fileURLToPath(new URL('.', import.meta.url));
  const templateDir = resolve(here, '..', 'template');

  if (!existsSync(templateDir)) {
    process.stderr.write(
      `Error: template dir not found at ${templateDir}. This is an installation issue.\n`,
    );
    process.exit(1);
  }

  process.stdout.write(`Creating ${pkgName} in ${dest}...\n`);
  await cp(templateDir, dest, { recursive: true });

  // npm strips leading-dot files from published packages, so the template uses
  // `gitignore` — rename it back into place on copy.
  const gitignoreSrc = join(dest, 'gitignore');
  const gitignoreDst = join(dest, '.gitignore');
  if (existsSync(gitignoreSrc)) {
    await rename(gitignoreSrc, gitignoreDst);
  }

  // Interpolate the user-supplied name into package.json.
  const pkgPath = join(dest, 'package.json');
  const pkgJson = await readFile(pkgPath, 'utf8');
  await writeFile(pkgPath, pkgJson.replace('PLACEHOLDER_NAME', pkgName));

  process.stdout.write('\nDone. Next steps:\n');
  process.stdout.write(`  cd ${nameArg}\n`);
  process.stdout.write('  cp .env.example .env   # fill in your keys\n');
  process.stdout.write('  pnpm install           # or npm install\n');
  process.stdout.write('  pnpm dev               # start on :3000\n');
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
