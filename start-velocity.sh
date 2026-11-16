#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ -z "${CARVARIABLES_API_KEY:-}" ]]; then
  read -r -s -p "Your CarVariables API key (not saved to disk): " CARVARIABLES_API_KEY
  echo
  export CARVARIABLES_API_KEY
fi
exec go run .
