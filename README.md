# VÉLOCITY — premium automotive discovery

VÉLOCITY is a responsive automotive discovery experience built with **Go**, Go's standard-library HTTP server and HTML templates, and plain CSS/JavaScript. No Node.js build step or paid UI libraries are required.

## What's included

- Expanded luxury homepage with uppercase kinetic headline, animated welcome beacon, cinematic lighting, parallax-style imagery, moving editorial ticker, longer story sections and interactive spotlight/tilt experience cards.
- The original bundled `static/hero-cover.png` remains the **top hero only**. Lower editorial panels use different Unsplash car photography, with a bundled custom `static/images/featured-exotic.svg` fallback if images are blocked.
- Curated vehicle collection, server-side search, marque filter, sorting and pagination.
- Responsive grid/list layout (saved in the browser).
- Vehicle detail pages with performance and technical specifications.
- Choose up to three vehicles for a side-by-side comparison. Comparisons have shareable links.
- Favorites saved locally in the current browser (no account or server-side storage).
- Responsive mobile navigation, image fallbacks, accessible labels and reduced-motion handling.
- Optional live Vehicles.dev listings and VIN details when an API key is supplied.
- Minimal security headers, input validation, upstream request timeouts and automated Go tests.

## Run locally

You need **Go 1.22 or newer**. From the project folder:

```bash
go run .
```

Open **http://localhost:8080**. To use a custom port:

```bash
PORT=3000 go run .
```

To run tests and format/check the code:

```bash
go test ./...
go test -race ./...
go vet ./...
gofmt -w main.go main_test.go api/*.go
```

The website works without an API key. The `data/cars.json` file contains a small **illustrative showroom catalogue**, not an inventory of vehicles for sale. Specifications are approximate and should not be treated as manufacturer-verified for a specific configuration.

## Optional vehicle listings API

Create a Vehicles.dev API key and set it in your shell (never commit your actual key):

```bash
export VEHICLES_API_KEY="your_key_here"
go run .
```

When a key is configured, the app loads up to 200 listings per request from the live API. In the event of an upstream error, the app falls back to the curated local catalogue. Live vehicle detail pages can be looked up directly by valid VIN rather than depending on the first results page. Upstream access has a 10-second timeout. API data and remote imagery depend on third-party service availability; no live API integration test is run without an actual key.

## Pages and endpoints

| URL | Purpose |
| --- | --- |
| `/` | Editorial home and featured vehicles |
| `/cars` | Searchable collection (supports `q`, `brand`, `sort`, `page`) |
| `/cars/{id}` | Vehicle details |
| `/compare` | Interactive comparison (supports `ids` as comma-separated IDs) |
| `/about` | Brand story |
| `/api/compare/specs?vin={id}` | JSON specification data |
| `/healthz` | Health check |

## Main project structure

```text
velocity/
├── api/                 # Vehicles.dev client and tests
├── data/cars.json       # Curated offline catalogue
├── static/
│   ├── css/style.css    # Unified responsive design system
│   ├── css/home-premium.css # Homepage-only luxury styling and motion
│   ├── js/              # Shared scripts + home-motion.js for light, headline and card interactions
│   ├── images/          # SVG fallbacks, custom second car artwork and favicon
│   └── hero-cover.png   # Existing project hero photograph
├── templates/           # Shared components and five page templates
├── main.go              # Routes, filtering, API fallback, template rendering
├── main_test.go         # HTTP and catalogue regression tests
└── go.mod
```

## Notes

- Start the server **from the project root**, because templates and assets are read relative to the current directory.
- Car images from external sources may fail on restricted networks; the page switches to the bundled vector fallback instead of showing broken images.
- Favorites live in `localStorage` on each browser; they are not synchronized across devices.
- To customize the showcase, edit `data/cars.json`, or replace photo URLs with local files under `static/images/`.
- This is an automotive *discovery* experience, not a checkout, booking, or dealership website.

## Customize the luxury homepage

- **Headline, Welcome animation, and copy:** `templates/index.html`
- **Color, typography, animations, images, spacing:** `static/css/home-premium.css`
- **Cursor light, title hover, interactive experience cards:** `static/js/home-motion.js`
- **Top hero image:** `static/hero-cover.png`
- **Second large photo:** `.statement-car-photo` in `templates/index.html`; this deliberately does **not** reuse the top hero image.
- **Offline image fallback:** `static/images/featured-exotic.svg`, an original vector illustration created for this edition.

The lower large photo and some catalogue photos load from Unsplash over the internet. If the image request fails, the lower image switches to the bundled local illustration. They are intentionally separate from the top-hero photo. Remote images should be downloaded/licensed and optimized into local files before production if you need fully offline photo reliability.

Animations respect `prefers-reduced-motion`, and hover-only effects are disabled on touch devices. No audio is played by the visual beacon. The homepage CSS/JS is kept separate so the non-home pages keep their working layout and features.
