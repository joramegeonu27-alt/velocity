# VÉLOCITY — Live Vehicle Photo Gallery

This upgrade adds a photograph-first vehicle browser to **Collection**, **Discovery**, and **Compare**. It does not replace the original Go routes, NHTSA VIN decoder, local curated showcase or saved comparisons.

## Getting started

1. Open the extracted `velocity` directory in your terminal.
2. Configure the CarVariables API key privately, in the same terminal in which you'll run the server:

   ```bash
   read -rsp "CarVariables API key: " CARVARIABLES_API_KEY; echo
   export CARVARIABLES_API_KEY
   ```
3. Run:

   ```bash
   go test ./...
   go run .
   ```
4. Visit `http://localhost:8080/cars`, `/discover`, and `/compare`.

Each page now has a **live vehicle gallery** with search, model/year/body/fuel/drive filters, pagination, image-first cards, available trim specifications, and a Compare action. Collection retains its original curated archive beneath the live gallery. Discovery's NHTSA model cards include **SEE CAR PHOTOS**, which opens a targeted search in the live gallery.

## Images and usage

- The browser first asks the Go route `/api/velocity/photo?file=...` to retrieve an image using a restricted, validated filename. If the proxy fails, it retries the **documented public** `image_url` directly. No secret key is ever placed in HTML or JavaScript.
- If both image methods fail or a model has no image, the card states **PHOTOGRAPH UNAVAILABLE**. It does not display another vehicle's photo as though it were a real match.
- Some images may be watermarked or absent. Photos depend on the provider's actual availability and permission.
- The server caches catalogue API responses and successfully downloaded photos in memory for 12 hours, and throttles upstream requests. The client only asks for 9 generations initially; more are loaded when a visitor clicks **LOAD MORE CARS**. Image requests may also count toward your provider allowance.
- The original NHTSA and safety APIs have not been replaced.

## Diagnosing a missing photo

Start VÉLOCITY with your configured key, and from a second terminal run:

```bash
curl -I "http://localhost:8080/api/velocity/photo?file=car_fb2e7fe275aa7cf62f1600660fa421e072870b18d8fd4f23.avif"
```

- `200 image/avif`: VÉLOCITY's image route works for this photo.
- `404`: That specific image was not provided.
- `429`: Usage allowance or rate limit reached.
- `502`: Photo fetch failed upstream. The browser also tries the permitted public URL.
- `503`: `CARVARIABLES_API_KEY` was not configured in the server's terminal.

Run `go test ./...` and `go vet ./...` after any local changes. **Do not commit or share the actual API key.**

## What's changed

- `templates/cars.html`, `templates/discover.html`, `templates/compare.html`: live photo gallery sections.
- `static/js/vehicle-gallery.js`: photo-first search, filters, trim details and comparison actions.
- `static/css/vehicle-gallery.css`: responsive warm-copper card layout.
- `static/js/discover-premium.js`: link from model research to photo search.
- `static/js/velocity-specifications.js`: direct image fallback.
- `static/js/compare-studio.js`: display and fallback for API-queried car photos.
- `vehicle_gallery_test.go`: regression checks that all three pages and assets are served.

The original photo-proxy implementation (`carvariables_photos.go`) remains in place.
