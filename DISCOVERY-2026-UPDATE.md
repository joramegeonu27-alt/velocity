# VÉLOCITY Discovery — bronze edition

This is a complete Go project with redesigned Discovery. It replaces the former green-accent Discovery with the site's warm bronze, cream and dark editorial design. All original website assets and routes are retained.

## Hero image — sunset edition

Your supplied supercar-at-sunset photo is now installed as the cinematic Discovery hero. On wide screens, the car is kept prominent on the left while the title is placed over the right-hand side. Bronze-tinted CSS gradients preserve legibility and integrate the image with VÉLOCITY's existing color palette. Small screens use a dedicated responsive image.

- `static/images/discovery-sunset-original.png` — exact user-uploaded original photo, retained unmodified.
- `static/images/discovery-sunset-hero.webp` — optimized full-resolution display asset.
- `static/images/discovery-sunset-mobile.webp` — smaller image for mobile bandwidth.
- `templates/discover.html` — picture markup and text/photo layout.
- `static/css/discover-premium.css` — photo placement, blending layers and responsive positioning.

No photos on other VÉLOCITY pages have been replaced. The hero photo is self-hosted, with no dependency on an external image server.

## Included Discovery features

- Shared site navigation and bronze/black visual design, responsive layout, glass-style surfaces, reveal effects, and loading placeholders.
- Manufacturer autocomplete, model-name suggestions, optional year, model search, animated research cards, quick-view dossier, local favorites, editorial quick-search picks (not live popularity trends), recent searches, related recommendations, random brand exploration, and saved searches.
- VIN lookup for specific vehicle specs, including body, fuel, gearbox, and drivetrain **where present in the VIN record**. Spec filters operate on VIN-decoded research garage entries; they are not falsely applied to manufacturer-model records.
- Safety-rating research by make/model/year and recall lookup when the research service returns data. Rates and recalls are not guaranteed for every model/year/configuration.
- Curated historical timeline, featured model research, sharing and CSV export.
- Third-party API calls remain behind same-origin VÉLOCITY Go endpoints; legally relevant data attribution remains near the end of the page.

## Start

```bash
go test ./...
go run .
```

Open `http://localhost:8080/discover`.

## Source caveat

As in the previous complete ZIP, the source baseline is a preserved Go VÉLOCITY archive with the NHTSA integration. It has **not** been independently verified as byte-identical to the latest public GitHub commit. No GitHub repo was changed.

## Notes

Model names and VIN metadata don't automatically include verified prices, live inventory, photos, or trim-specific performance specs. Discovery deliberately avoids duplicating Collection or Compare. Local browser storage holds recent research and saved choices on the current device.

## API research limitations

The current vehicle-name search API does not include trim-specific body/fuel/transmission/drivetrain specifications. These values populate only after a VIN decode, where the manufacturer has submitted them. Safety rating records cover tested configurations, not every individual car. A missing recall record cannot guarantee a vehicle has no active recalls.
