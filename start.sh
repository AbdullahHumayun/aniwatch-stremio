#!/bin/sh
set -e

# Render sets PORT for the public-facing service.
# FlareSolverr runs on a fixed internal port so it doesn't collide.
ADDON_PORT="${PORT:-7000}"
SOLVER_PORT=8191

export FLARESOLVERR_URL="http://localhost:${SOLVER_PORT}"

echo "[start] Launching FlareSolverr on internal port ${SOLVER_PORT}..."
PORT="${SOLVER_PORT}" \
  LOG_LEVEL=info \
  LOG_HTML=false \
  CAPTCHA_SOLVER=none \
  TZ=UTC \
  python -u /app/src/flaresolverr.py &

echo "[start] Waiting for FlareSolverr to be ready..."
WAITED=0
until curl -sf "http://localhost:${SOLVER_PORT}/" >/dev/null 2>&1; do
  WAITED=$((WAITED + 2))
  if [ "${WAITED}" -gt 120 ]; then
    echo "[start] ERROR: FlareSolverr did not start within 120s" >&2
    exit 1
  fi
  sleep 2
done
echo "[start] FlareSolverr ready after ${WAITED}s"

echo "[start] Launching AniWatch addon on port ${ADDON_PORT}..."
exec env PORT="${ADDON_PORT}" node /addon/index.js
