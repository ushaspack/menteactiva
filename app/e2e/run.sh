#!/usr/bin/env bash
# Arranca la app compilada desde cero y ejecuta el recorrido. Uso: bash e2e/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=${PORT:-3100}
# libera el puerto (los datos de ejemplo viven en memoria: hay que arrancar limpio)
fuser -k "$PORT/tcp" >/dev/null 2>&1 || true
sleep 1
(SESSION_SECRET="${SESSION_SECRET:-test-secret-solo-para-e2e-0123456789abcdef}" npx next start -p "$PORT" > "${TMPDIR:-/tmp}/next-$PORT.log" 2>&1 &)
for _ in $(seq 1 40); do curl -s -o /dev/null "http://localhost:$PORT/entrar" && break; sleep 1; done
python3 -I e2e/flow.py "http://localhost:$PORT"
python3 -I e2e/edge.py "http://localhost:$PORT"
python3 -I e2e/feedback.py "http://localhost:$PORT"
