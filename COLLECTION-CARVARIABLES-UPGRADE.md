# VÉLOCITY Collection — CarVariables catalogue upgrade

- Collection video hero at `/static/videos/collection-hero.mp4` is preserved unchanged.
- Collection is now a responsive, compact 6-column photo-first vehicle generation directory.
- Search by make/model/year; filter body, fuel, drivetrain; sort; search quick picks and make chips; 18 per page and Load more.
- Cards show provider image, origin flag, make, model, production years, fuels, variants, power. Expand for engine trims. No comparison actions on Collection/Discover.
- Compare page continues to handle comparisons separately. Existing NHTSA endpoints retained.

## Run

`export CARVARIABLES_API_KEY=...` (set securely in your shell, do not commit your key).
`go test ./...`
`go run .`
Open `http://localhost:8080/cars`.

Images are not bundled: they are requested dynamically from CarVariables. The API can return image URLs with no accessible photo; those cards display a clearly identified unavailable state. Provider limits/attribution apply. The API is cached for 12 hours in memory but traffic still consumes your monthly allowance.

This package was built from the latest available saved VÉLOCITY project rather than a verified fresh GitHub clone.
