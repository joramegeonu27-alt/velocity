# VÉLOCITY — Premium Discover integration

## What is inside

This is a **complete runnable Go project ZIP** including the recovered VÉLOCITY Go codebase,
its templates, styles, JavaScript, catalogue and previously bundled car videos, together
with the new cinematic Discover page and the previously developed NHTSA Go API handlers.

The source baseline is the previously saved **VELOCITY_Original_Golang_Restored.zip**.
The public GitHub `main.go` was checked for the NHTSA route registrations on October 27, 2026,
and the package includes the matching previously developed `nhtsa.go` and `nhtsa_test.go`.
The latest GitHub archive could not be downloaded into this environment, so the package is
**not certified as a bit-for-bit copy of the newest GitHub commit**. It preserves the available
original website files and includes the functional NHTSA and Discover integration.

## Running

```bash
cd velocity
go test ./...
go run .
```

Open `http://localhost:8080/discover`. All other pages should remain available.

Routes: `/`, `/cars`, `/cars/{id}`, `/compare`, `/about`, `/discover`,
`/api/nhtsa/makes`, `/api/nhtsa/models?make=Toyota&year=2024`.

Discover features: distinct responsive navigation, local cinematic image assets,
motion effects, marque quick picks, year selection, live API results, filtering, sorting,
favorites saved to this browser, shareable searches and CSV export.

## Source & imagery

The added Discover hero photographs are copies of previously bundled car photos
from VÉLOCITY's existing media folder. All the originals are preserved.
Additional images elsewhere in the existing website might load from third parties.
NHTSA vehicle model records do not supply prices or vehicle photography.

## Integration notes

The original lightweight `/discover` handler remains in `nhtsa.go` but is **not**
registered; the new `/discover` route uses `discoverPremiumHandler`.
The API handler methods remain available. Go project structure is unchanged.
Do not commit secret API keys or `.env` files.
