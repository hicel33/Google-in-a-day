#!/usr/bin/env bash
# Run backend + frontend on localhost (Linux/macOS).
# Usage: from repo root, after: chmod +x scripts/run-local.sh
#   ./scripts/run-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need_cmd python3
need_cmd npm

if [[ ! -d .venv ]]; then
  echo "Creating .venv …"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

echo "Installing Python deps …"
pip install -q -r requirements.txt

BACK_PID=""
cleanup() {
  if [[ -n "${BACK_PID}" ]] && kill -0 "${BACK_PID}" 2>/dev/null; then
    echo "Stopping backend (pid ${BACK_PID}) …"
    kill "${BACK_PID}" 2>/dev/null || true
    wait "${BACK_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://127.0.0.1:8000 …"
python -m backend.serve --host 127.0.0.1 --port 8000 &
BACK_PID=$!

# Wait until API accepts connections (no curl required)
python - <<'PY'
import time
import urllib.error
import urllib.request

for _ in range(40):
    try:
        urllib.request.urlopen("http://127.0.0.1:8000/stats", timeout=0.5)
        break
    except (urllib.error.URLError, TimeoutError, OSError):
        time.sleep(0.15)
PY

cd frontend
if [[ ! -d node_modules ]]; then
  echo "Installing frontend deps …"
  npm install
fi

echo "Starting frontend on http://127.0.0.1:5173 …"
echo "Open the UI, then use Crawler → Start crawl."
npm run dev -- --host 127.0.0.1
