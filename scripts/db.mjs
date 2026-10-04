#!/usr/bin/env node
// EF Core migration commands for local development, run from the repo root via npm scripts.
//
// Usage:
//   node scripts/db.mjs migrate [TargetMigration] [--if-configured]
//   node scripts/db.mjs add <MigrationName>
//   node scripts/db.mjs remove
//   node scripts/db.mjs list
//
// Why a wrapper instead of plain `dotnet ef` in package.json:
//   - dotnet runs with cwd = EcommerceAPI/, so global.json and the dotnet-ef local tool apply.
//   - `migrate` connects as the ecommerce_migrator role (DDL), never as the API's ecommerce_app role.
//     Its connection string is built from .env (or the same defaults as compose.yaml) and passed
//     with --connection, so it is never written to a file.
//   - Until the backend adds EF Core (Microsoft.EntityFrameworkCore.Design + a DbContext), every
//     command explains that instead of failing with a dotnet-ef stack trace. `--if-configured`
//     turns that into a skip (exit 0), so `npm run dev` keeps working before EF Core exists.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND_DIR = path.join(ROOT, 'EcommerceAPI');
const PROJECT = 'EcommerceAPI.csproj';

const args = process.argv.slice(2);
const ifConfigured = args.includes('--if-configured');
const [command, ...rest] = args.filter((a) => a !== '--if-configured');

const USAGE = `usage: node scripts/db.mjs <migrate [Target] | add <Name> | remove | list> [--if-configured]`;

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function run(cmd, cmdArgs, cwd, env = {}) {
  // shell: false so the connection string (with its password) is passed as one argument, unquoted
  // by any shell, and never echoed.
  const result = spawnSync(cmd, cmdArgs, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.error) fail(`Failed to run ${cmd}: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function efCoreConfigured() {
  const csproj = readFileSync(path.join(BACKEND_DIR, PROJECT), 'utf8');
  return csproj.includes('Microsoft.EntityFrameworkCore.Design');
}

function migratorConnectionString() {
  // Real environment variables win over .env, like docker compose.
  const envFile = path.join(ROOT, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const env = (name, fallback) => process.env[name] ?? fallback;
  return [
    'Host=localhost',
    `Port=${env('POSTGRES_PORT', '5432')}`,
    `Database=${env('POSTGRES_DB', 'ecommerce')}`,
    'Username=ecommerce_migrator',
    `Password=${env('MIGRATOR_DB_PASSWORD', 'change-me-migrator')}`,
  ].join(';');
}

const ef = (efArgs, env) =>
  run('dotnet', ['tool', 'run', 'dotnet-ef', ...efArgs, '--project', PROJECT], BACKEND_DIR, env);

if (!['migrate', 'add', 'remove', 'list'].includes(command)) fail(USAGE, 2);

if (!efCoreConfigured()) {
  const message =
    'EF Core is not set up in EcommerceAPI yet (no Microsoft.EntityFrameworkCore.Design package),\n' +
    'so there are no migrations to run. The backend adds EF Core + a DbContext first; these\n' +
    'commands work from then on.';
  if (ifConfigured) {
    console.log(`db: skipping migrations. ${message.split('\n')[0]}`);
    process.exit(0);
  }
  fail(`db: ${message}`);
}

switch (command) {
  case 'migrate': {
    // Applies pending migrations, or rolls back/forward to [Target] (use 0 to revert everything).
    run('docker', ['compose', 'up', '-d', '--wait', 'db'], ROOT);
    const target = rest[0] ? [rest[0]] : [];
    ef(['database', 'update', ...target, '--connection', migratorConnectionString()]);
    break;
  }
  case 'add': {
    const name = rest[0];
    if (!name || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      fail(
        'usage: npm run db:migration:add -- <MigrationName>   (PascalCase, e.g. AddProducts)',
        2,
      );
    }
    ef(['migrations', 'add', name]);
    break;
  }
  case 'remove':
    // Deletes the most recent migration's files; refuses if it is already applied to the database
    // (revert it first with `npm run db:migrate -- <PreviousMigration>`). `migrations remove` has no
    // --connection option, so the connection goes in through the app's own config key instead.
    run('docker', ['compose', 'up', '-d', '--wait', 'db'], ROOT);
    ef(['migrations', 'remove'], { ConnectionStrings__Default: migratorConnectionString() });
    break;
  case 'list':
    run('docker', ['compose', 'up', '-d', '--wait', 'db'], ROOT);
    ef(['migrations', 'list', '--connection', migratorConnectionString()]);
    break;
}
