#!/usr/bin/env sh
set -eu

if ! psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -tAc "SELECT 1 FROM pg_database WHERE datname='microblog_test'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
    -c "CREATE DATABASE microblog_test;"
fi
