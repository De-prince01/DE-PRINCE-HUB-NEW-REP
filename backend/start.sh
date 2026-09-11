#!/usr/bin/env bash
# DE-PRINCE DIGITAL HUB - production entrypoint
# Runs DB migrations, optional first-boot seed, then starts uvicorn.
set -e

echo "[startup] app_env=${APP_ENV:-production}"

# Derive the async URL from the sync URL (and vice versa) so a single
# pooled connection string (e.g. Render's) is enough.
if [ -z "$DATABASE_URL" ] && [ -n "$DATABASE_URL_SYNC" ]; then
  DB_SYNC="$DATABASE_URL_SYNC"
  DB_SYNC="${DB_SYNC#postgresql+psycopg2://}"
  DB_SYNC="${DB_SYNC#postgres://}"
  DB_SYNC="${DB_SYNC#postgresql://}"
  export DATABASE_URL="postgresql+asyncpg://${DB_SYNC}"
fi
if [ -z "$DATABASE_URL_SYNC" ] && [ -n "$DATABASE_URL" ]; then
  DB_A="$DATABASE_URL"
  DB_A="${DB_A#postgresql+asyncpg://}"
  export DATABASE_URL_SYNC="postgresql+psycopg2://${DB_A}"
fi

if [ -z "$DATABASE_URL" ] || [ -z "$DATABASE_URL_SYNC" ]; then
  echo "[startup] ERROR: neither DATABASE_URL nor DATABASE_URL_SYNC is set"
  exit 1
fi
echo "[startup] database: ${DATABASE_URL%%:*}"

echo "[startup] running migrations..."
cd /app
alembic upgrade head

# First-boot seed: admin user, wallets, services, branches, banks.
if [ "${SEED_ON_BOOT:-true}" = "true" ]; then
  echo "[startup] seeding baseline data..."
  python -m app.utils.seed
fi

PORT="${PORT:-8000}"
echo "[startup] starting API on 0.0.0.0:${PORT}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" --workers "${WEB_CONCURRENCY:-2}"