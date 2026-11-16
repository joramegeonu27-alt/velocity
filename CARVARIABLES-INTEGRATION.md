# VÉLOCITY — CarVariables integration (Go)

This upgrade adds detailed vehicle-generation and engine/trim specifications to **Discovery** and **Compare** without replacing NHTSA VIN decoding, recalls, safety ratings, the curated Collection or the existing Compare features.

## Set up your private API key

Your key is **not included** in this project. Do not paste it into Go files, HTML, JavaScript or GitHub.

In the same terminal you will use to start the Go server:

```bash
read -rsp "Enter CarVariables API key: " CARVARIABLES_API_KEY; echo
export CARVARIABLES_API_KEY
go test ./...
go run .
```

Note: your key will disappear from the environment when you close that terminal. The command above does not put your key in shell history. On production hosting, set `CARVARIABLES_API_KEY` using the host's secrets/environment-variable settings.

## Test in another terminal

```bash
curl -sS 'http://localhost:8080/api/velocity/search?q=BMW%20M3%202008&per=1&variants=1' | python3 -m json.tool
curl -sS 'http://localhost:8080/api/velocity/vehicles?make=BMW&modelFamily=M3&modelYear=2008&per=1&variants=1' | python3 -m json.tool
```

Both requests call **your Go backend**, which adds the secret `X-API-Key` header when contacting CarVariables. If you see `not_configured`, start the server in the terminal that has your exported key.

## Where visitors use it

- `/discover#full-specs`: Smart vehicle-generation search and precise filters for make, model, year, body, fuel and drivetrain. Explore specific trims, performance, specifications and images. The previous NHTSA discovery tools and VIN research remain available.
- `/compare#precision-search`: Search real specifications, select an engine/trim and add it to the three-car Comparison Studio. Missing values remain absent. Model-generation `0–100 km/h` is kept separate from showroom `0–60 mph` times.

## Back-end source files

- `carvariables.go`: `/api/velocity/search` and `/api/velocity/vehicles`, server-side authentication, validation, 12-hour bounded in-memory cache, in-flight de-duplication and one upstream request per second.
- `carvariables_test.go`: secret redaction, cache, endpoint, input validation and exhausted-quota response tests.
- `static/js/velocity-specifications.js`: user-facing catalogue search, generation and trim cards, variant-level details, and adding trims to Compare.
- `static/css/velocity-specifications.css`: page-scoped black/copper styling.
- `static/js/compare-studio.js`: integration with curated and VIN vehicles, chart and table handling for available 0–100 km/h values.

## Important notes

- CarVariables free plan: 1,000 calls per calendar month. Every different query and page may consume a request; repeat identical requests are cached for 12 hours **while the Go server is running**.
- The returned `year_start` / `year_end` describe a **generation**, not a guarantee that every trim was sold in every year. The interface marks nearest-year search matches. Individual specifications can be null.
- Images may be watermarked. CarVariables attribution remains visible in Discovery and Compare as required by its free plan.
- No performance statistics are fabricated. 0–100 km/h and 0–60 mph are distinct measurements and not mathematically substituted for each other.
- The CarVariables service does not replace NHTSA's VIN, crash-test or recall data. Existing Collection inventory/curated cars are not silently overwritten with generation data.
- The service communicates with a fixed trusted API host. The browser never receives your API key. Provider API metadata is removed from frontend responses.
- When you share a comparison with `cv:` entries, the link includes the search phrase (not the API key) so other visitors can load the exact generation/variant where it is available from the catalogue.

## Troubleshooting

- `503 not_configured`: set `CARVARIABLES_API_KEY` and restart `go run .` in that terminal.
- `502 authentication_failed`: check your key's status in your account. Do not share the key in screenshots or logs.
- `429 quota_exceeded`: the monthly request allowance has run out; NHTSA features and the existing curated website continue to work.
- `404 no_results`: loosen the filters, or try a natural-language make/model search.

To run tests without a real API key: `go test ./...`. Tests use an isolated simulated upstream endpoint and do not spend your quota.

## Vehicle photographs — repaired delivery

The VÉLOCITY Specification search on Discovery and Compare uses generation-level photographs from the CarVariables catalog when `image_url` is provided. Those images **do not automatically replace** the curated Collection, Homepage, or hero assets.

The frontend requests a first-party URL `/api/velocity/photo?file=car_…avif` instead of attempting to download the image directly from an external origin. `carvariables_photos.go` restricts requests to published `car_<hex>.avif`-style filenames under CarVariables' image directory, forwards authentication only to the approved upstream, applies a 12-hour in-memory cache, and shares the one-request-per-second allowance with catalogue searches. Images that genuinely are absent or denied still display VÉLOCITY's fallback artwork.

To check whether your API allows image downloads, first start the server **in the terminal with your exported** `CARVARIABLES_API_KEY`. In a second terminal:

```bash
curl -I 'http://localhost:8080/api/velocity/photo?file=car_fb2e7fe275aa7cf62f1600660fa421e072870b18d8fd4f23.avif'
```

Expect `HTTP/1.1 200 OK` and `Content-Type: image/avif` for that example image if it is available on your plan. If you receive `503`, the key is not configured in the Go server process. A `502` can mean the upstream is unreachable or denied the image; inspect the *upstream* status without sharing your key:

```bash
curl -s -o /dev/null -w 'Photo HTTP status: %{http_code}\n' \
  -H "X-API-Key: $CARVARIABLES_API_KEY" \
  'https://carvariables.com/images/car_fb2e7fe275aa7cf62f1600660fa421e072870b18d8fd4f23.avif'
```

Do not paste your key in chat. CarVariables free-plan pictures are watermarked and require visible provider attribution; that attribution remains in Discovery and Compare. Photo downloads may consume the monthly allowance.
