// lint-staged: runs on STAGED files only, from the repo root. Modified files are re-staged.
// Globs are kept non-overlapping so no two tasks touch the same file concurrently.

const quote = (files) => files.map((f) => JSON.stringify(f)).join(' ');
const isUiFile = (f) => /[\\/]ecommerce-ui[\\/]/.test(f);

export default {
  // Prettier for everything except TS/JS (handled below together with oxlint).
  '*.{json,jsonc,css,md,yml,yaml,html,mjs,cjs}': 'prettier --write',

  // TS/JS: format first, then lint the frontend files with the UI's oxlint config.
  // Warnings fail the commit (--deny-warnings). oxlint has no stylistic rules, so it
  // never fights Prettier.
  '*.{ts,tsx,js,jsx}': (files) => {
    const ui = files.filter(isUiFile);
    return [
      `prettier --write ${quote(files)}`,
      ...(ui.length
        ? [
            `npm --prefix ecommerce-ui exec -- oxlint -c ecommerce-ui/.oxlintrc.json --deny-warnings ${quote(ui)}`,
          ]
        : []),
    ];
  },

  // C#: APPLY `dotnet format` fixes (whitespace + code style + analyzer fixes) to the
  // staged files and let lint-staged re-stage them, same model as `prettier --write`.
  // The full verify-only check is `npm run lint:api`. The format target (csproj today,
  // .slnx later) is defined once in scripts/dotnet-format.mjs.
  'EcommerceAPI/**/*.cs': (files) => `node scripts/dotnet-format.mjs fix ${quote(files)}`,
};
