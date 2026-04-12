#!/usr/bin/env bash
cd "$(dirname "$0")"

# venv naming: .venv_tk for user tk, .venv for user gtpv
if [ -d ".venv_$(whoami)" ]; then
  PYTHON=".venv_$(whoami)/bin/python"
elif [ -d ".venv" ]; then
  PYTHON=".venv/bin/python"
else
  echo "ERROR: No venv found. Run: python3 -m venv .venv_$(whoami) && .venv_$(whoami)/bin/pip install -r requirements.txt"
  exit 1
fi

echo "Starting Program B (피아노 타일 펌프) on port 8001..."
$PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
