# Go → Python: VÉLOCITY migration notes

The original ZIP stays intact. This package is the **Python Studio Edition**.

## 1. Where the Go code went

| Go file/function | Python equivalent |
| --- | --- |
| `main.go` / `routes()` | `app.py` FastAPI route decorators |
| `main.go` / `loadCars()` | `app.py` / `load_cars()` |
| `main.go` / `catalogue()` | `app.py` / `catalogue()` |
| `main.go` / `filterAndSort()` | `app.py` / `filter_and_sort()` |
| `main.go` / `findCar()` | `app.py` / `find_car()` |
| `main.go` / `compareSpecsHandler()` | `app.py` / `comparison_specs()` |
| `api/vehicles.go` | `api/vehicles.py` |
| Go `html/template` syntax | Jinja2 (`{% for %}`, `{% if %}`, `{{ variable }}`) |
| Go `main_test.go` | `tests/test_app.py` |
| Go `go.mod` | Python `requirements.txt` |

## 2. Identified issues addressed

- **Incorrect card brand after template conversion:** the card is in a nested loop, so its label now uses `car.brand` rather than a filter's `brand` value.
- **Homepage animation selector mismatch:** `home-motion.js` now points at `.luxury-refined-title`, the class actually used in the HTML.
- **Dormant collection pause/play button:** `cars.js` now wires it to video playback, user preference and page visibility; reduced-motion and data-saver modes hide it.
- **Favorites semantics:** saved vehicles update the button's accessible name, tooltip, heart and pressed state together.
- **Repeated provider failures:** an unsuccessful live API request falls back to local data and pauses retries for 60 seconds; successful live listings cache for 5 minutes.
- **Malformed catalogue records:** missing required identifiers, duplicate IDs, invalid JSON shape and nonnumeric statistics are handled explicitly.
- **Error handling and safety:** request query limits, HTML-escaping, VIN validation, security headers and a designed 404 page are in place.

## 3. Design changes

- New `static/css/velocity-next.css`: premium metallic-gold accents, refined glass-and-graphite surfaces, card hover treatments, improved mobile layouts, accessibility styles and restrained motion.
- New collection editorial signature ribbon, scroll progress and back-to-top action.
- Original imagery, CSS, static movie assets and JavaScript features preserved.

## 4. How to understand the Python request flow

```text
Browser GET /cars?q=BMW
        |
        v
FastAPI route @app.api_route('/cars', ...)
        |
        v
catalogue() -> load local JSON (or optional live API)
        |
        v
filter_and_sort() -> search and sorting
        |
        v
pagination (6 vehicles / page)
        |
        v
Jinja2 cars.html + partials/carcard.html
        |
        v
HTML returned to browser
        |
        v
Your existing CSS + JavaScript enhance the page
```

## 5. Verification

Automated Python tests include routes, templates, car metadata, search, sorting, 404s, escaping, comparison JSON, static files, and mocked live API recovery. Run with `python -m pytest -q` after installing `requirements-dev.txt`.

**Limitations:** Network-restricted environments cannot verify live vehicles.dev responses or external Unsplash image availability. A real cross-browser visual inspection on your laptop is still recommended.
