#!/usr/bin/env bash
# Set up the Quote API: create a venv, install deps. Requires Python 3.10+.
set -euo pipefail

cd "$(dirname "$0")"

# --- Locate a suitable Python interpreter (3.10+) ---
find_python() {
  for cand in python3 python3.13 python3.12 python3.11 python3.10; do
    if command -v "$cand" >/dev/null 2>&1; then
      if "$cand" -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' 2>/dev/null; then
        echo "$cand"
        return 0
      fi
    fi
  done
  return 1
}

PY="$(find_python)" || {
  echo "ERROR: Python 3.10+ is required but was not found." >&2
  exit 1
}
echo "Using $("$PY" --version) at $(command -v "$PY")"

# --- Create virtual environment (preferred) ---
USE_VENV=1
if [ ! -d .venv ]; then
  if ! "$PY" -m venv .venv 2>/tmp/venv_err; then
    echo "WARN: could not create a virtualenv (is python3-venv installed?):" >&2
    sed 's/^/  /' /tmp/venv_err >&2 || true
    echo "WARN: falling back to a user-site install." >&2
    rm -rf .venv
    USE_VENV=0
  fi
fi

if [ "$USE_VENV" = "1" ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
  python -m pip install --upgrade pip >/dev/null
  python -m pip install -r requirements.txt
  RUN_PREFIX="source .venv/bin/activate && "
else
  # No venv available: install into the user site, tolerating PEP 668 envs.
  PIP_FLAGS="--user"
  if "$PY" -m pip install --help 2>/dev/null | grep -q -- '--break-system-packages'; then
    PIP_FLAGS="$PIP_FLAGS --break-system-packages"
  fi
  # shellcheck disable=SC2086
  "$PY" -m pip install $PIP_FLAGS -r requirements.txt
  RUN_PREFIX=""
fi

# --- Node / pnpm (TypeScript workspace: Flake Radar + Failure Lens) ---
if command -v node >/dev/null 2>&1; then
  if command -v pnpm >/dev/null 2>&1; then
    echo "Installing TypeScript workspace dependencies..."
    if [ -f pnpm-lock.yaml ]; then
      CI=true pnpm install --frozen-lockfile
    else
      CI=true pnpm install
    fi
  else
    echo "WARN: pnpm not found; skipping TypeScript workspace dependencies." >&2
  fi
else
  echo "WARN: node not found; skipping TypeScript workspace dependencies." >&2
fi

echo
echo "Setup complete. To run the API:"
echo "  ${RUN_PREFIX}uvicorn app.main:app --reload"
echo
echo "To run tests:"
echo "  ${RUN_PREFIX}pytest"
echo
echo "To typecheck TypeScript packages:"
echo "  pnpm -r typecheck"
