#!/usr/bin/env bash
set -euo pipefail
PORT="${PORT:-8080}"
BASE="http://localhost:${PORT}"
echo "Checking VÉLOCITY live vehicle search at ${BASE} ..."
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
STATUS="$(curl -sS -o "$TMP" -w '%{http_code}' "${BASE}/api/velocity/search?q=BMW%20M3%202008&per=1&variants=1")"
echo "Vehicle search HTTP status: $STATUS"
if [[ "$STATUS" != 200 ]]; then
  python3 -m json.tool "$TMP" || cat "$TMP"
  exit 1
fi
FILE="$(python3 - "$TMP" <<'PY'
import json,sys,re
with open(sys.argv[1],encoding='utf-8') as f: data=json.load(f)
results=data.get('data',{}).get('results',[])
print(f"Vehicle records found: {len(results)}",file=sys.stderr)
for car in results:
    print(f"Result: {car.get('make',{}).get('name','')} {car.get('name','')}",file=sys.stderr)
    image=car.get('image_url') or ''
    name=re.search(r'/images/(car_[a-fA-F0-9]{32,80}\.(?:avif|webp|jpg|jpeg|png))$', image)
    if name:
        print(name.group(1))
        break
PY
)"
if [[ -z "$FILE" ]]; then
  echo "No matching photo URL returned for this model. Try another model."
  exit 0
fi
echo "Checking model-matched image through VÉLOCITY ..."
curl -sS -o /dev/null -w 'Vehicle photo HTTP status: %{http_code} (%{content_type})\n' "${BASE}/api/velocity/photo?file=${FILE}"
