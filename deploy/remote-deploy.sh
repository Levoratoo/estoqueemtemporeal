#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-192.168.1.82}"
REMOTE_USER="${REMOTE_USER:-pedro-levorato}"
REMOTE_DIR="${REMOTE_DIR:-/opt/sites_dev/estoque-em-tempo-real}"
APP_PORT="${APP_PORT:-3012}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Sincronizando projeto para ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p '${REMOTE_DIR}'"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude out \
  --exclude .next \
  "${PROJECT_ROOT}/" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> Build e subida do container (porta host ${APP_PORT})"
ssh "${REMOTE_USER}@${REMOTE_HOST}" bash -s <<EOF
set -euo pipefail
cd '${REMOTE_DIR}'
docker compose build --pull
docker compose up -d
docker compose ps
echo ""
echo "App disponível em: http://${REMOTE_HOST}:${APP_PORT}/dashboard/"
EOF

echo "==> Deploy concluído."
