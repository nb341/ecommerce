# Ecommerce

E-commerce MVP monorepo, with tasks run by [Nx](https://nx.dev):

- `ecommerce-ui/` (Nx project `ui`): React 19 + Vite + TypeScript SPA
- `EcommerceAPI/` (Nx project `api`): ASP.NET Core (.NET 10) Web API

## Prerequisites

- Node.js 24 LTS (npm 11)
- .NET 10 SDK
- Docker Desktop (Compose v2), and it must be running
- Git
- [gitleaks](https://github.com/gitleaks/gitleaks): `winget install Gitleaks.Gitleaks` or
  `brew install gitleaks`. The pre-commit hook requires it.

## First-time setup

From the repo root:

```sh
npm install    # repo tooling (Nx, Prettier, git hooks)
npm run setup  # UI dependencies, dotnet tools + restore, creates .env from .env.example
```

Run every command below from the repo root.

## Run the whole app

```sh
npm run dev
```

This starts everything, with hot reload:

1. **Database:** Postgres and Redis in Docker. It waits until they're healthy, then applies any
   pending migrations.
2. **Backend:** the API with `dotnet watch`, at http://localhost:5277.
3. **Frontend:** the UI with Vite, at **http://localhost:5173**. It forwards `/api` to the backend.

Stop it with **Ctrl+C**. Postgres and Redis keep running in Docker; stop them with `npm run down`.

To run everything in containers instead (production-like images: the UI on nginx, the API
in Release mode):

```sh
npm run docker:up    # build and start db, redis, api and ui
npm run docker:logs  # follow the logs
npm run down         # stop all containers (database data is kept)
```

With `docker:up` the UI is at **http://localhost:8081** and the API at http://localhost:5277.
Use either `dev` or `docker:up`, not both at once: they use the same API port.

## Run each part separately

| Part     | Command           | What it does                                                                                              |
| -------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| Database | `npm run dev:db`  | Starts Postgres (port 5432) and Redis (port 6379) in Docker, then applies pending migrations.             |
| Backend  | `npm run dev:api` | API with hot reload at http://localhost:5277. It runs `dev:db` first, because the API needs the database. |
| Frontend | `npm run dev:ui`  | UI with hot reload at http://localhost:5173. It needs a running backend for `/api` calls.                 |

Postgres and Redis keep running in the background until you run `npm run down`.

## Database migrations

Migrations are EF Core migrations in `EcommerceAPI/Migrations/`. They're applied with the
`ecommerce_migrator` database role. The API never migrates on startup.

| Command                              | What it does                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:migration:add -- <Name>` | Creates a new migration from your model changes, e.g. `npm run db:migration:add -- AddProducts`.                                |
| `npm run db:migrate`                 | Applies all pending migrations to the local database.                                                                           |
| `npm run db:migrate -- <Migration>`  | Migrates up or down to that migration (`0` reverts all of them). Use it to undo an applied migration.                           |
| `npm run db:migration:list`          | Lists the migrations and marks which ones are still pending.                                                                    |
| `npm run db:migration:remove`        | Deletes the latest migration's files. It refuses if that migration is applied; revert it first with `db:migrate -- <Previous>`. |
| `npm run db:reset`                   | **Deletes all local data**: recreates the database from scratch and reapplies every migration.                                  |

Typical flow after changing an entity: run `db:migration:add -- <Name>`, review the generated
file, then run `db:migrate`. (`npm run dev` and `npm run dev:db` also apply pending migrations.)

> EF Core isn't added to the API yet. Until the backend adds it, the migration commands print a
> message saying so, and `dev` / `dev:db` skip the migration step.

## Other commands

```sh
npm run build         # build the UI and the API (Nx, cached)
npm run lint          # oxlint (UI) + dotnet format --verify-no-changes (API) (Nx, cached)
npm run format        # format everything (Prettier + dotnet format)
npm run format:check  # check formatting without changing files
npm run graph         # open the Nx project graph
npx nx <target> <ui|api>   # any single Nx task, e.g. npx nx build api
```

## Ports

| Service          | Address                      |
| ---------------- | ---------------------------- |
| UI (`dev`)       | http://localhost:5173        |
| UI (`docker:up`) | http://localhost:8081        |
| API              | http://localhost:5277        |
| API health check | http://localhost:5277/health |
| PostgreSQL       | `localhost:5432`             |
| Redis            | `localhost:6379`             |

If a port is already in use on your machine, change it in `.env`.

Commits must follow Conventional Commits with a scope, e.g. `feat(ui): add cart page`
(scopes: `ui`, `api`, `db`, `devops`, `docs`).

Full details: [docs/devops/local-setup.md](docs/devops/local-setup.md).
