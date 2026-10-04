# Local setup

This covers toolchain pins, running the app (natively and in Docker), formatting, linting, git
hooks and the commit message convention. Migration commands are in the
[README](../../README.md#database-migrations) and [Migrations](#migrations) below.

## Prerequisites

| Tool     | Version                             | Notes                                                                                                             |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Node.js  | 24.x LTS (>= 24.12.0)               | Pinned in `.nvmrc` and `package.json` `engines`. `nvm use` / `fnm use` picks it up.                               |
| npm      | >= 11.7.0                           | Pinned in `package.json` `packageManager` (`npm@11.7.0`).                                                         |
| .NET SDK | 10.0.x (feature band 100 or later)  | Pinned in `EcommerceAPI/global.json` (`rollForward: latestFeature`).                                              |
| Docker   | Docker Desktop 4.x (Compose v2.20+) | Windows: WSL2 backend. Needed for Postgres/Redis even when the API and UI run natively.                           |
| Git      | 2.40+                               | On Windows use Git for Windows; hooks run under Git Bash.                                                         |
| gitleaks | 8.19+                               | **Required.** The pre-commit hook fails without it. `winget install Gitleaks.Gitleaks` / `brew install gitleaks`. |

After installing gitleaks on Windows, open a **new** terminal (and restart your editor) so it is on
`PATH`. Check with `gitleaks version`.

## One-time setup

From the repository root (`practice/`):

```sh
npm install    # root tooling (Nx, Prettier, Husky, lint-staged, commitlint); installs the git hooks
npm run setup  # ecommerce-ui deps, dotnet tool restore + dotnet restore, copies .env.example -> .env if missing
```

`npm run setup` (`scripts/setup.mjs`) is idempotent and never overwrites an existing `.env`.

`npm install` runs the `prepare` script (`husky`), which points `core.hooksPath` at `.husky/_`.
If hooks don't run, rerun `npm run prepare`.

EF Core tooling is a local tool (`EcommerceAPI/.config/dotnet-tools.json`). Run it from
`EcommerceAPI/` as `dotnet ef ...` (or `dotnet tool run dotnet-ef ...`); no global install needed.

## Running the app

There are two ways to run it, both from the repository root. Run **one at a time**, because both
use host port 5277 for the API.

| Command               | What runs                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`         | `nx run-many -t dev`: `db` + `redis` in Docker (waits until healthy), then the API (`dotnet watch`, `http` profile) and the UI (Vite) natively. |
| `npm run dev:db`      | Only `db` + `redis` in Docker, waits until healthy, then applies pending EF Core migrations (skipped until EF Core exists).                     |
| `npm run dev:api`     | `nx dev api`: starts `db` + `redis` first (its `infra` dependency), then the API with hot reload.                                               |
| `npm run dev:ui`      | `nx dev ui`: only the UI dev server.                                                                                                            |
| `npm run docker:up`   | Everything in containers (`--profile full`); builds the API and UI images.                                                                      |
| `npm run docker:logs` | Follow the container logs.                                                                                                                      |
| `npm run down`        | Stop and remove the containers. The database volume is kept.                                                                                    |
| `npm run db:reset`    | **Destructive**: removes the containers and the database volume, then runs `dev:db` (fresh database plus all migrations).                       |

Use `npm run dev` day to day for fast hot reload. Before committing Docker or proxy changes, run
`docker:up` to check the production-like images (nginx, non-root users, healthchecks).

Stop `npm run dev` with **Ctrl+C** in its terminal, which stops the API and Vite too. If you close
the terminal window instead, they can keep running on Windows (see Troubleshooting).

### Nx

[Nx](https://nx.dev) is the task runner. It sits on top of the existing layout: there are no
npm workspaces, `ecommerce-ui/` keeps its own `package.json` and lockfile, and nothing was moved.

| Project | Root            | Defined by                                                                                                                                                                  |
| ------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui`    | `ecommerce-ui/` | `ecommerce-ui/project.json`. Targets `dev`, `build`, `lint` and `preview` call the UI's npm scripts, so npm, Nx and the Dockerfile run the same commands.                   |
| `api`   | `EcommerceAPI/` | `@nx/dotnet` infers `build`, `build:release`, `restore`, `publish`, `watch`, `run` and `clean` from the csproj. `EcommerceAPI/project.json` adds `infra`, `dev` and `lint`. |

- **Caching.** `build`, `lint`, `typecheck` and `test` are cached in `.nx/cache` (gitignored).
  An unchanged project replays its result instead of running again. `nx reset` clears the cache
  and the project-graph data.
- **Useful commands:**
  - `npx nx show projects` / `npx nx show project api` list projects and targets.
  - `npm run graph` opens the project graph.
  - `npx nx run-many -t build --skip-nx-cache` forces a real run.
- **`npm run affected`** (`nx affected -t lint build`) runs only the projects changed since `main`.
  It needs at least one commit on `main`.
- **Nx Cloud is off** (`neverConnectToCloud` in `nx.json`). The cache is local only.
- **Run `npm run setup` before building.** The inferred .NET `build` uses `--no-restore`, so it
  expects `dotnet restore` to have run.
- **Adding a project:**
  - A new .NET project (for example `EcommerceAPI.Tests`) is picked up automatically by `@nx/dotnet`.
  - A new JS/TS package needs its own `project.json`.

The `overrides` block in the root `package.json` bumps three of Nx's pinned transitive
dependencies (`axios`, `brace-expansion`, `smol-toml`) to patched versions within the same major
version, so `npm audit` is clean. Remove it once an Nx release ships those fixes itself.

### Ports

Every published port binds to `127.0.0.1` only. If something else already uses a port, change it in `.env`.

| Service            | URL / port                   | `.env` variable |
| ------------------ | ---------------------------- | --------------- |
| UI (Vite, `dev`)   | http://localhost:5173        | (Vite default)  |
| UI (nginx, Docker) | http://localhost:8081        | `UI_PORT`       |
| API                | http://localhost:5277        | `API_PORT`      |
| API health         | http://localhost:5277/health |                 |
| PostgreSQL         | `localhost:5432`             | `POSTGRES_PORT` |
| Redis              | `localhost:6379`             | `REDIS_PORT`    |

### How the pieces connect

- **`/api` is same-origin.** The browser only talks to the UI origin. Vite (`dev`) and nginx
  (`docker:up`) both proxy `/api/*` to the API without changing the path, so the API needs no CORS
  and **backend routes must live under `/api/...`**. To point Vite at a different API, run
  `API_PROXY_TARGET=http://host:port npm run dev:ui`.
- **`compose.yaml`:**
  - `db` runs `postgres:18-alpine` on the named volume `ecommerce_db-data`.
  - `redis` runs `redis:8-alpine` as a pure cache (no persistence, 128 MB, LRU eviction).
  - `api` and `ui` are behind the `full` profile, so a plain `docker compose up` starts only the
    infrastructure.
- **Images:**
  - `EcommerceAPI/Dockerfile` publishes with the .NET SDK and runs on `aspnet:10.0-alpine` as the
    non-root `app` user on port 8080, with a healthcheck on `/health`.
  - `ecommerce-ui/Dockerfile` builds with Node 24 and serves `dist/` from `nginx-unprivileged`.
    Its config in `ecommerce-ui/nginx/` provides the SPA fallback, immutable caching for `/assets`,
    `no-cache` for `index.html`, gzip, security headers, and a CSP that already allows Stripe.js.

### Database roles

On the **first start of an empty volume**, `docker/postgres/init/01-roles.sh` creates the two roles
below. It creates no tables and no seed data; those come only from EF Core migrations.

| Role                 | Purpose                                                 | Privileges                                                       |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| `ecommerce_migrator` | Runs migrations                                         | Owns schema `public` (DDL)                                       |
| `ecommerce_app`      | What the API connects as (`ConnectionStrings__Default`) | `SELECT/INSERT/UPDATE/DELETE` on everything the migrator creates |

The init script runs only on an empty volume. If you change `APP_DB_PASSWORD` or
`MIGRATOR_DB_PASSWORD` in `.env`, run `npm run db:reset`, which deletes your local data.

To connect as the superuser, run `docker compose exec db psql -U postgres -d ecommerce`.

### Environment variables

Docker Compose reads `.env`, which is gitignored. Every variable is optional: `compose.yaml` falls
back to the same local-only defaults as `.env.example`. Compose passes the containerised API
`ConnectionStrings__Default` (as `ecommerce_app`) and `ConnectionStrings__Redis`. When the API runs
natively, put those keys in `dotnet user-secrets` (backend-owned), never in a committed
`appsettings*.json`.

### Migrations

The `db:*` npm scripts call `scripts/db.mjs`, which runs the `dotnet-ef` local tool inside
`EcommerceAPI/`.

- **`db:migrate` and `db:migration:list`** connect as `ecommerce_migrator`. They build the
  connection string from `.env` (or the compose defaults) and pass it with `--connection`, so it
  never lands in a file.
- **`db:migration:remove`** has no `--connection` option in `dotnet ef`, so it receives the same
  connection string through `ConnectionStrings__Default`. **The backend's `DbContext` must
  therefore read `ConnectionStrings:Default`**, which is the key compose already uses.
- **`db:migration:add`** needs no database.

Until the API references `Microsoft.EntityFrameworkCore.Design`, the commands print an explanation
and exit. `dev:db` passes `--if-configured`, so it skips the migration step instead.

### Not done yet

- **Migrator service for `docker:up`.** `npm run dev` applies migrations natively, but the
  containerised stack doesn't yet. Once the backend adds EF Core and a `DbContext`:
  - Add a `migrator` stage to `EcommerceAPI/Dockerfile` that builds
    `dotnet ef migrations bundle --self-contained`.
  - Add a one-shot `migrator` compose service that runs the bundle as `ecommerce_migrator`, with
    `depends_on: db: service_healthy`.
  - Make `api` wait for it with `service_completed_successfully`.

  The API must never migrate on startup.

- **Connection strings for the native API**, via `dotnet user-secrets` (see above).

## Format and lint

All commands run from the repository root and are the same commands future CI will run.

| Command                | What it does                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run format`       | Prettier `--write` on the whole repo, then `dotnet format` (applies fixes) on the backend.     |
| `npm run format:check` | Prettier `--check` + `dotnet format --verify-no-changes`. Fails if anything is unformatted.    |
| `npm run lint`         | `nx run-many -t lint`: both projects, in parallel, cached.                                     |
| `npm run lint:ui`      | `nx lint ui`: oxlint on `ecommerce-ui/` with `--deny-warnings` (warnings fail).                |
| `npm run lint:api`     | `nx lint api`: `dotnet format --verify-no-changes` (whitespace, code style, analyzers).        |
| `npm run build`        | `nx run-many -t build`: `tsc -b && vite build` for the UI, `dotnet build` for the API, cached. |

Who formats what:

- **`.editorconfig`** (root) is the single source for charset, LF line endings and indentation,
  plus the C# code-style rules and analyzer severities (`dotnet_diagnostic.*`).
- **Prettier** (`.prettierrc.json`, `.prettierignore`) formats TS/JS/JSON/CSS/Markdown/YAML/HTML.
  It does not touch C#. `.claude/` (agent prompts), lockfiles, build output and EF migrations are
  ignored.
- **oxlint** (`ecommerce-ui/.oxlintrc.json`) lints the frontend with the `react` (incl. hooks
  rules), `jsx-a11y`, `typescript`, `import` and `oxc` plugins, `correctness` rules as errors. No
  stylistic rules, so it never conflicts with Prettier.
- **`dotnet format`** formats and style-checks C#, driven by `.editorconfig`. Analyzer level and
  `TreatWarningsAsErrors` will live in `EcommerceAPI/Directory.Build.props` (backend-owned).

`scripts/dotnet-format.mjs` wraps `dotnet format` so it always runs inside `EcommerceAPI/`
(so `global.json` applies) and so the format target is defined in one place. It currently targets
`EcommerceAPI.csproj`; when the backend adds a solution file, change `TARGET` in that script to
the `.slnx` and every command and hook follows.

### Tailwind class sorting (not enabled yet)

`prettier-plugin-tailwindcss` is intentionally **not** installed yet: Tailwind isn't in the
frontend and `ecommerce-ui/src/styles/index.css` doesn't exist, and the plugin needs Tailwind v4
plus that stylesheet to sort classes correctly. Once the frontend adds Tailwind v4 and that CSS
entry (with `@import "tailwindcss";`):

1. `npm install -D -E prettier-plugin-tailwindcss` at the repo root.
2. Add to `.prettierrc.json`:
   ```json
   "plugins": ["prettier-plugin-tailwindcss"],
   "tailwindStylesheet": "./ecommerce-ui/src/styles/index.css"
   ```
3. Run `npm run format` once and commit the result as `chore(devops): enable tailwind class sorting`.

## Git hooks

Hooks are managed by Husky (`.husky/`), written in POSIX `sh`, with LF endings, so they work in Git
Bash on Windows and on macOS/Linux.

**`pre-commit`** (fast; staged files only):

1. **gitleaks** scans the staged changes for secrets (`gitleaks git --pre-commit --staged`). If
   gitleaks isn't installed, the hook prints install instructions and **fails**; it is never
   silently skipped.
2. **lint-staged** (`.lintstagedrc.mjs`) on the staged files:
   - `*.{json,jsonc,css,md,yml,yaml,html,mjs,cjs}`: `prettier --write`
   - `*.{ts,tsx,js,jsx}`: `prettier --write`, then oxlint `--deny-warnings` for files under
     `ecommerce-ui/`
   - `EcommerceAPI/**/*.cs`: `dotnet format` **applies** fixes to the staged files (like
     `prettier --write`) and lint-staged re-stages them. The verify-only variant is
     `npm run lint:api`. Expect ~5-10 s when C# files are staged (MSBuild loads the project).

Fixes made by the hook are added to your commit automatically. If a check can't be fixed
automatically (lint error, secret found), the commit is aborted and your changes are left as they
were. Fix the problem and commit again. Do not bypass hooks with `--no-verify`; if a finding is a
false positive, add a targeted allow rule (e.g. a `.gitleaksignore` entry or `// oxlint-disable-next-line rule -- reason`) in the same commit.

**`commit-msg`**: commitlint checks the message (see below).

**`pre-push`**: not set up yet. Once the backend has test projects it will run
`npm --prefix ecommerce-ui run build` and the unit tests (`dotnet test`, integration tests
excluded), keeping slow checks out of pre-commit.

## Commit message convention

[Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint
(`commitlint.config.mjs`, extends `@commitlint/config-conventional`):

```
<type>(<scope>): <subject>
```

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **scope** (required): `ui`, `api`, `db`, `devops`, `docs`. Several are allowed: `feat(api,db): ...`
- **subject**: imperative, lower case, no trailing period; header max 100 characters.

Examples:

```
feat(ui): add product search bar
fix(api): return 404 for unknown product id
chore(devops): add prettier and git hooks
docs(docs): describe local setup
```

Test a message without committing: `echo "feat(ui): add cart" | npx commitlint`.

## Troubleshooting

- **Line endings.** `.gitattributes` stores everything with LF (except `*.cmd/*.bat/*.ps1`), and
  `.editorconfig` tells editors to write LF. If `dotnet format` reports `ENDOFLINE` or Prettier
  flags whole files, run `npm run format` once. Don't set `core.autocrlf` per repo to fight this;
  `.gitattributes` wins.
- **`gitleaks: command not found` in the hook** after installing: open a new terminal / restart
  the editor so the updated `PATH` is picked up.
- **Hooks don't run**: run `npm run prepare` and check `git config core.hooksPath` prints
  `.husky/_`.
- **`dotnet format` fails with restore errors**: run `dotnet restore` in `EcommerceAPI/`.
- **Port already in use**: change `POSTGRES_PORT` / `REDIS_PORT` / `API_PORT` / `UI_PORT` in `.env`.
  `npm run dev` fails on port 5277 while `docker:up` is running, so run `npm run down` first.
- **`docker compose` can't connect** (Windows): start Docker Desktop and wait until the engine is running.
- **Postgres init fails with `/bin/sh^M`**: `docker/postgres/init/01-roles.sh` has CRLF line endings.
  `.gitattributes` forces LF on checkout. If an editor converted the file, save it as LF and run
  `npm run db:reset`.
- **Ports 5277/5173 still in use after closing a `npm run dev` terminal** (Windows): the API and
  Vite are still running. Killing only the process on port 5277 isn't enough, because `dotnet watch`
  restarts the API. Stop the watcher and Vite from PowerShell:
  ```powershell
  Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -match 'dotnet-watch\.dll|vite\\bin' } |
    ForEach-Object { taskkill /PID $_.ProcessId /T /F }
  ```
  Next time, stop with Ctrl+C.
- **Nx shows stale projects or targets** (for example after editing a `project.json` or the csproj):
  run `npx nx reset`.
