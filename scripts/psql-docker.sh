#!/bin/sh
set -eu
# Forward secret values through inherited environment, never command arguments.
if command -v docker >/dev/null 2>&1; then
  construction_docker_bin=$(command -v docker)
elif [ -x /Applications/Docker.app/Contents/Resources/bin/docker ]; then
  construction_docker_bin=/Applications/Docker.app/Contents/Resources/bin/docker
else
  echo 'Docker no está disponible.' >&2
  exit 1
fi
construction_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$construction_docker_bin" compose --project-directory "$construction_script_dir/.." exec -T \
  -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE -e PGCONNECT_TIMEOUT -e PGOPTIONS \
  db psql "$@"
