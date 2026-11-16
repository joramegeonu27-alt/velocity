# VÉLOCITY — Copper Directory & Manufacturers (November 2026)

This is the **complete Go project**. The Collection hero video is unchanged.

## New Collection experience
- Widened vehicle directory with larger photo cards and translucent warm-brown glass styling.
- Subtle continuous copper light/glass sheen, disabled when reduced motion is requested.
- Click a car photograph to reveal its generation **Overview / Variants / Specifications / Dimensions / Timeline** in a detail panel to the right on desktop. On smaller screens, the detail panel stacks above the gallery.
- Grid/List switcher is available on Collection, Discovery and Compare.
- Collection and Discovery are browse-only. Only Compare emits the `velocity:add-car` action and adds selected variants to the existing comparison studio.

## Manufacturers page
- New navbar entry: **Manufacturers** at `/manufacturers`.
- 128 curated brand names, country indicators and monogram emblems (these are not official brand logos).
- Brand name search, country filter, featured/A-Z sorting, grid/list layout.
- Selecting a brand loads its available generations using the existing Go backend `/api/velocity/vehicles?make=...` and displays matching photographs. A model search, sort, and Load More support further exploration.
- Selecting a generation opens Collection filtered to that manufacturer and model.

## Authentication and live photos

From this directory run:

```bash
./start-velocity.sh
```

The script asks for your **CarVariables API key** if `CARVARIABLES_API_KEY` is not already exported. Never paste the API key into a frontend file or commit it to GitHub.

The browser calls only VÉLOCITY's local endpoints:

- `/api/velocity/search` → CarVariables `/v1/search`
- `/api/velocity/vehicles` → CarVariables `/v1/cars`
- `/api/velocity/photo` → photo proxy for published CarVariables images

Images are fetched *at runtime*. The full provider's photo catalogue is **not** bundled into the ZIP. Missing image records display a clear unavailable state, never an unrelated photograph.

CarVariables Free plan may provide watermarked photographs and requires attribution (provided under each gallery). Caching and pagination reduce repeated requests, but API and image quotas still apply.

The CarVariables OpenAPI schema supplied for this project only documents `/v1/cars` and `/v1/search`, **not a complete manufacturers-index API**. The manufacturer name/country list is curated locally; model generations and image URLs come from live API responses after selecting a brand. That distinction avoids claiming a live complete brand index.

## Local checks

```bash
go test ./...
go vet ./...
go run .
```

Open `http://localhost:8080/cars`, `http://localhost:8080/manufacturers`, `http://localhost:8080/discover`, `http://localhost:8080/compare`.

If vehicle data reports `not_configured` (HTTP 503), your running Go process is missing `CARVARIABLES_API_KEY`. Stop it and restart in the terminal that exported the key.

## Editing and GitHub

This ZIP does not modify GitHub. If your current clone contains uncommitted changes, make a backup or use the **update-only ZIP** before merging. Commit and push only after testing, otherwise recloning GitHub will restore the older version.

## Verification performed

Go tests, race-enabled tests, `go vet`, JavaScript syntax, and isolated Chromium DOM interaction checks with sample API responses (not a live CarVariables request). Live CarVariables data and images still require your key and local internet connectivity.
