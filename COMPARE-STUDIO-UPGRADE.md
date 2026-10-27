# VÉLOCITY — Compare Studio & Vehicle Intelligence update (October 2026)

## What this archive contains

The complete, standalone Go VÉLOCITY project from the most recent complete project archive available in this conversation, updated with the new VÉLOCITY nav logo, demo VINs and premium Compare Studio. This archive is **not a byte-for-byte verified clone of the current GitHub main branch**; if you have newer local changes, back them up before replacing files.

## Start

From this `velocity/` folder:

```sh
go test ./...
go vet ./...
go run .
```

Open http://localhost:8080/discover and http://localhost:8080/compare.

The port can be changed using `PORT=9000 go run .`.

## Updated files

- `templates/shared.html` and `static/images/velocity-logo.webp` — user-provided navbar logo on every page; original file kept as PNG.
- `templates/discover.html`, `static/css/discover-premium.css`, `static/js/discover-premium.js` — new VIN heading, description and 3 test examples.
- `templates/compare.html`, `static/css/compare-studio.css`, `static/js/compare-studio.js` — cinematic studio, three cars, comparison table, collapsible sections, differences, metrics, priority-based insights, history and PDF print layout.
- `main.go` — added read-only `/api/compare/catalogue` endpoint, preserving all prior routes.
- `compare_studio_test.go` — new tests for the above.

## How to compare

1. Go to `/compare` and choose 2–3 vehicles using the autocomplete and make/year/trim search. Click **ENTER THE STUDIO**.
2. Use the toggles to highlight advantages and hide equal specification rows. Click a category heading to collapse its rows.
3. Optional: use **Find Models** to find a model/year record, or enter a VIN to add decoded vehicle details. If a model has no measured performance data, VÉLOCITY displays — rather than guessing.
4. Explore performance bars, relative radar chart and **VÉLOCITY Intelligence** (rule-based comparisons, not generative AI). Choose a priority to see only evidence-backed comparisons.
5. Save comparisons to your browser, share a URL, or click PDF → use your browser's **Save as PDF** printer option.

## Demonstration VINs

These examples have been checked against NHTSA's public decoder pages (at the time of writing):

- Honda Accord, 2003: `1HGCM82633A004352`
- Toyota Camry, 2025: `4T1DAACK2SU047491`
- Ford Taurus, 2015: `1FAHP2E83FG172456`

The samples are for exploring the interface only and do not imply that the vehicles are for sale. Enter the VIN on Discovery to see its information. Recall and crash-test datasets do not necessarily match a particular car's exact trim.

## Data integrity and limits

The bundled `data/cars.json` contains **illustrative vehicle specifications** from the original site, not a manufacturer-certified database. Exact trims, torque, dimensions, fuel economy, cabin technology and many safety figures may be unavailable. Local catalogue data, manufacturer/model records and VIN-level data are kept separate and unknown figures are never invented. Performance comparison bars and radar charts only appear where recorded numbers allow comparison.

Safety availability and model/year recall counts depend on live third-party services. A model/year recall count is not proof a particular VIN is affected or repaired. The safety field only says whether rating *variants* are listed, not that one rating applies to an exact VIN. Safety data may be incomplete. The public NHTSA source attribution is retained in Discovery where needed.

Sharing a comparison containing a VIN places the selected VIN in the URL; the interface asks for consent. Saved comparisons and history are stored only in the user's browser (localStorage). The PDF action launches the browser's print dialog; it does not upload private data or create a server-side PDF.

The Compare page does not duplicate Collection's inventory browsing or Discovery's full vehicle research experience. It reuses the existing data and endpoints for comparative display only.

## Tests performed

- `go test ./...` and `go vet ./...`
- Node JS syntax check `node --check static/js/compare-studio.js`
- Isolated headless Chromium DOM/CSS/JS interaction tests with mocked API responses for desktop and mobile. These confirm navigation logo, 9 local picker cards, 2-car selection, comparison tables, 3 insight cards, charts, difference toggle and zero page overflow. Live third-party API calls were not checked in browser tests.

## GitHub

This ZIP is not pushed to your GitHub repo. Back up your current folder before replacing it. To publish this version yourself, review diffs, commit, and push from your own clone.
