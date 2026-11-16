# VÉLOCITY live vehicle photography and page roles

This build uses the CarVariables API for photographed vehicle generations. The API key must be supplied at runtime as CARVARIABLES_API_KEY and is never included in this archive.

- Collection: live catalogue photos, search, filter, inspect generation/trim specifications. NO comparison action.
- Discovery: NHTSA manufacturer/model and VIN research plus CarVariables vehicle photography and trim specifications. NO comparison action.
- Compare: CarVariables photo cards are selectable. Selecting a photo adds the first available variant; expanding trim details allows selecting a specific variant. Compare remains the only page with compare actions.

Cinematic hero images/videos are editorial media and are retained; they are not catalogued car-product photos. Only real CarVariables results are presented as live vehicle photos. An unavailable image is marked unavailable rather than replaced by an unrelated old car photo.

CarVariables API free-plan limits apply. Image availability, model coverage and attribution depend on the provider. The entire provider photo database is not bundled into this project.

Run `go test ./...`, then set `CARVARIABLES_API_KEY` in the server process environment and run `go run .`. The default localhost port is 8080.
