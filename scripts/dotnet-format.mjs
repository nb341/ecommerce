#!/usr/bin/env node
// Cross-platform wrapper around `dotnet format` for the backend.
//
// Usage:
//   node scripts/dotnet-format.mjs fix   [files...]   # apply formatting/style fixes
//   node scripts/dotnet-format.mjs check [files...]   # --verify-no-changes (lint / CI)
//
// Why a wrapper instead of a plain npm script:
//   - dotnet runs with cwd = EcommerceAPI/, so EcommerceAPI/global.json (SDK pin)
//     and EcommerceAPI/.config/dotnet-tools.json apply. `dotnet` resolves global.json
//     from the current directory, not from the project path.
//   - lint-staged passes absolute paths; they are made relative to EcommerceAPI/.
//   - The format target lives in ONE place (TARGET below).
//
// When the backend gets a solution file, change TARGET to e.g. 'EcommerceAPI.slnx'.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'EcommerceAPI',
);
const TARGET = 'EcommerceAPI.csproj';

const [mode, ...files] = process.argv.slice(2);
if (mode !== 'fix' && mode !== 'check') {
  console.error('usage: node scripts/dotnet-format.mjs <fix|check> [files...]');
  process.exit(2);
}

const args = ['format', TARGET];
if (mode === 'check') args.push('--verify-no-changes');
if (files.length > 0) {
  const relative = files.map((f) =>
    path.relative(BACKEND_DIR, path.resolve(f)).split(path.sep).join('/'),
  );
  args.push('--include', ...relative);
}

const result = spawnSync('dotnet', args, { cwd: BACKEND_DIR, stdio: 'inherit' });
if (result.error) {
  console.error(
    `Failed to run dotnet: ${result.error.message}\nInstall the .NET 10 SDK: https://dotnet.microsoft.com/download`,
  );
  process.exit(1);
}
process.exit(result.status ?? 1);
