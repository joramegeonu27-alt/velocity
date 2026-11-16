# VÉLOCITY — Live CarVariables Photo-First Catalogue

Collection (`/cars`), Discovery (`/discover`), and Compare (`/compare`) now show live CarVariables vehicle generations in searchable, paginated photo cards. The old editorial photo grids and the visible local Collection archive have been removed from those pages. Existing Go data, vehicle detail URLs, and NHTSA functionality remain available internally.

CarVariables API calls are authenticated only in Go via `CARVARIABLES_API_KEY`. The image comes from each result's `image_url`, using the provider image directly first and a safe, filename-restricted Go proxy if needed. Never substitute a different vehicle photo when a specific result has no image. Provider attribution must remain visible.

The API can return a large catalogue; no website can eagerly retrieve *all* images without exhausting your 1,000 free requests/month. This release loads 9 vehicle generations initially and more on demand. Some records may not include an image. Photographs are the provider's watermarked assets where available and require provider availability / plan allowances.

On Compare, click a photo to add the first returned engine/trim immediately. Alternatively expand 'Vehicle specifications' and select a different trim before adding. Add 2–3 for a side-by-side specification comparison.

## Run

Run from inside the `velocity` folder:

```bash
read -rsp "CarVariables API key: " CARVARIABLES_API_KEY; echo
export CARVARIABLES_API_KEY
go test ./...
go run .
```

Go server in same shell as `export`! Confirm API:

```bash
curl -sS 'http://localhost:8080/api/velocity/vehicles?make=BMW&modelFamily=M3&modelYear=2008&variants=1&per=1' | python3 -m json.tool
```

Open Collection, Discovery, Compare in browser and hard refresh. `no_results` and `quota_exceeded` are visible errors, not replacement static imagery.

## Source

Reconstructed from the latest full VÉLOCITY project package available in this conversation. The public GitHub branch was reviewed but couldn't be cloned from this environment. This ZIP does not modify your GitHub repository.
