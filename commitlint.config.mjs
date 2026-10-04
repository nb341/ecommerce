// Conventional Commits, e.g. `feat(ui): add cart drawer`, `fix(api): reject negative quantity`.
// A scope is required and must be one of the areas below (several allowed: `feat(api,db): ...`).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['ui', 'api', 'db', 'devops', 'docs']],
    'scope-empty': [2, 'never'],
  },
};
