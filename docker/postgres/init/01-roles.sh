#!/bin/sh
# Runs ONCE, when the db volume is first initialised (postgres image entrypoint).
# Creates roles and privileges only. Tables and seed data come from EF Core migrations, never here.
#
#   ecommerce_migrator  owns the public schema; runs migrations (DDL).
#   ecommerce_app       what the API connects as; DML only on objects the migrator creates.
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v db="$POSTGRES_DB" \
  -v app_password="$APP_DB_PASSWORD" \
  -v migrator_password="$MIGRATOR_DB_PASSWORD" <<'SQL'
CREATE ROLE ecommerce_migrator LOGIN PASSWORD :'migrator_password';
CREATE ROLE ecommerce_app LOGIN PASSWORD :'app_password';

REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"db" TO ecommerce_migrator, ecommerce_app;

ALTER SCHEMA public OWNER TO ecommerce_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ecommerce_app;

-- Everything the migrator creates later is usable (DML only) by the app role.
ALTER DEFAULT PRIVILEGES FOR ROLE ecommerce_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ecommerce_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ecommerce_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ecommerce_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ecommerce_migrator IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO ecommerce_app;
SQL
