# VÉLOCITY

VÉLOCITY is a luxury car website where users can explore, view, and compare vehicles and their specifications.

## Run locally

Requirements: Go 1.22.2 or later.

```bash
go run .
```

Open http://localhost:8080.

## Vehicles.dev API setup

The API key must stay in your terminal environment. Do not paste it into Go files or commit it to Git.

On Linux, set the key in the same terminal before starting the server:

```bash
export VEHICLES_API_KEY="paste-your-new-vehicles-dev-key-here"
go run .
```

The key should be a valid Vehicles.dev API key. The server reads the `VEHICLES_API_KEY` environment variable. Restart the server after changing it.

If the key is not set, or the Vehicles.dev listings service fails, the site uses the local catalogue in `data/cars.json`. This fallback is intentional so the Cars and Compare pages can still load during an API outage. Live listing results may not include performance figures such as horsepower or 0–60 time; those fields are shown as unavailable rather than as fake zero values.

## Troubleshooting

- **Cars page loads only the three sample vehicles:** the API key may be missing/invalid, or the listings endpoint may be unavailable. Check the terminal where `go run .` is running.
- **401 Unauthorized:** create/verify a valid key in the Vehicles.dev dashboard and set `VEHICLES_API_KEY` again.
- **402 Payment Required:** check whether your Vehicles.dev plan has credits or included calls remaining for the listings endpoint.
- **503 Service Unavailable:** the API's listings upstream may be down temporarily. The app retries short 503 failures and then falls back to `data/cars.json`.
- **Images fail to load:** the page uses remote demo images, which can change or block hotlinking. Failed card images fall back to `/static/hero-cover.png`.

## Security

Never commit API keys. If a key was ever placed directly in source code or shared publicly, revoke it and create a replacement.
