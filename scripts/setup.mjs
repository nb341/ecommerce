#!/usr/bin/env node
// One-time local setup (idempotent, safe to rerun):
//   1. npm install in ecommerce-ui/
//   2. dotnet tool restore + dotnet restore in EcommerceAPI/ (cwd matters for global.json)
//   3. copy .env.example to .env if .env doesn't exist yet (never overwrites)
//
// Run with `npm run setup` after the root `npm install`.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, cwd) {
  console.log(`\n> ${command} ${args.join(' ')}  (in ${path.relative(ROOT, cwd) || '.'})`);
  // shell: true so `npm` resolves to npm.cmd on Windows.
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\nsetup: "${command} ${args.join(' ')}" failed.`);
    process.exit(result.status ?? 1);
  }
}

run('npm', ['install'], path.join(ROOT, 'ecommerce-ui'));
run('dotnet', ['tool', 'restore'], path.join(ROOT, 'EcommerceAPI'));
run('dotnet', ['restore'], path.join(ROOT, 'EcommerceAPI'));

const envFile = path.join(ROOT, '.env');
const envExample = path.join(ROOT, '.env.example');
if (existsSync(envFile)) {
  console.log('\n.env already exists, left unchanged.');
} else if (existsSync(envExample)) {
  copyFileSync(envExample, envFile);
  console.log('\nCreated .env from .env.example. Change the passwords before sharing anything.');
} else {
  console.log('\nNo .env.example found; compose.yaml falls back to its local defaults.');
}

console.log('\nSetup done. Start everything with: npm run dev');
