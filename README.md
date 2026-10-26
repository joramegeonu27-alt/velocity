# VÉLOCITY — Studio Edition

**An editorial, cinematic automotive discovery experience.** Python-powered backend, premium responsive interface, curated car collection, specs, favorites and up to 3-way comparisons.

![VÉLOCITY home poster](static/images/home-hero-poster.jpg)

## What changed

- Replaced the **Go server** with a **Python / FastAPI** application and **Jinja2** templates.
- Preserved the supplied original CSS, JavaScript, films, photography and existing page layouts.
- Added a *Studio Edition* styling layer (`static/css/velocity-next.css`) with refined controls, editorial typography, architectural accents and improved mobile states.
- Restored correct marquee/card labels using template scope, fixed the homepage animated-title selector, added a working pause/play control to the collection video, improved favorite button accessibility and added a page scroll indicator / back-to-top control.
- Included defensive local data validation, properly encoded pagination links, error pages, optional live vehicle lookup, a 5-minute in-process cache for live listings, input validation and security headers.
- Ported and expanded the original Go regression checks to Python automated tests.

## Quick start (Linux / Ubuntu, macOS)

Requires **Python 3.10+**.

```bash
cd velocity
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:8080**. By default the site uses `data/cars.json`, so **no API key is needed**.

On Windows, activate the virtual environment with `.venv\\Scripts\\activate` before running the install and server commands.

For automatic reload while developing:

```bash
uvicorn app:app --reload --port 8080
```

## Pages and API

| URL | Purpose |
| --- | --- |
| `/` | Cinematic homepage + featured cars |
| `/cars` | Searchable, sortable, paginated collection; grid/list toggle |
| `/cars/<id>` | Car specs, optional photo gallery, favorite action |
| `/compare` | Pick 2–3 cars and compare, share URLs through `?ids=...` |
| `/about` | About the VÉLOCITY editorial experience |
| `/api/compare/specs?vin=<id>` | Comparison specs, JSON |
| `/healthz` | `{"status":"ok"}` health check |

Favorites and chosen grid/list mode are persisted locally in the browser. They are **not account-synced**.

## Optional live vehicle API

The site defaults to the bundled, illustrative JSON collection. To enable `vehicles.dev` access, set an environment variable **on the server** (do not commit credentials):

```bash
export VEHICLES_API_KEY='your_api_key'
python app.py
```

If the API is unavailable, the collection falls back to `data/cars.json`; live listing results are cached for 5 minutes to avoid repeated requests. Live VIN detail pages attempt vehicle, specification and photo lookups. This feature was tested with mock responses; accessing the live provider requires a valid API account and internet connectivity.

## Test the migration

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

The tests cover routes, the HTML templates, errors, 404s, search, sort order, pagination, comparison responses, escaping, static assets, security headers, catalogue validation, live-data fallbacks and VIN validation.

## Project map

```text
velocity/
├── app.py                       # routes and catalogue logic
├── api/vehicles.py              # optional VIN/listings/specs/photos API
├── data/cars.json               # offline catalogue
├── templates/                   # Jinja2 HTML templates
│   └── partials/                # navbar, footer, reusable car cards
├── static/css/                  # original styles + Studio Edition overlay
├── static/js/                   # original UI features, with fixes
├── static/images/               # bundled posters and fallbacks
├── static/videos/               # bundled cinematic films
├── tests/test_app.py            # migration regression suite
├── requirements.txt
└── requirements-dev.txt
```

## Notes and limits

- This is an **exploration/showcase site**, not a dealer marketplace or commerce platform. Specs are illustrative and may vary by model or region.
- Some car photographs are hosted on Unsplash. The UI swaps a bundled SVG fallback if an external image cannot be loaded; online photos require internet access.
- Keep `VEHICLES_API_KEY` private. The browser must not receive this key.
- The included Python server is designed for local development. For public deployment, run Uvicorn behind an HTTPS reverse proxy / hosting platform and configure production monitoring.
- The migration ZIP intentionally excludes the Go binaries and `.git/` data. Your original ZIP remains an untouched copy of the Go implementation.
