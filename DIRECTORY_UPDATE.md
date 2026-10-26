# VÉLOCITY — Collection + NHTSA Directory Update

## What changed
- New "Explore beyond the showcase" panel on `/cars` with manufacturer and optional year lookup.
- Directory matches remain separate from curated photo cards because NHTSA does not supply photographs, trims, or comprehensive performance specifications.
- `/discover` labels an entered year as an NHTSA year query, not an independently verified production year.
- The original collection, comparison, media, and routes are retained.
- Graceful directory error handling; HTTP errors do not take down collection.

## Start
```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 app.py
```
Visit http://127.0.0.1:8080/cars and scroll to "Explore beyond the showcase". Try BMW, 2024.

## Tests
```bash
python3 -m pytest -q
```

## Honest limitation
NHTSA vPIC is a vehicle-directory service, not a complete photographic catalogue. Year-scoped API results are not independent verification of trim, production years, available photographs, or detailed specifications. Image and full-spec integrations need other appropriately licensed services.
