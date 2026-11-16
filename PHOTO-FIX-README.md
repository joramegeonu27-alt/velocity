# VÉLOCITY — CarVariables photo display repair

## What changed

- Vehicle Specification cards on Discovery and Compare now request photographs from VÉLOCITY's **own Go image endpoint** (`/api/velocity/photo`), rather than fetching the third-party image URL in the browser.
- The Go endpoint only accepts vetted CarVariables photo filenames; it does not fetch arbitrary URLs. The API key stays server-side.
- A 12-hour in-memory image cache and shared 1-request/second pacing help protect your monthly free-plan allowance.
- Existing NHTSA, Collection, Home, Compare, and Discovery functionality remains unchanged.
- Unavailable photos still display the local VÉLOCITY placeholder. CarVariables attribution remains in the specification sections.

## Setup

In the project directory, export your API key in the SAME terminal you use to launch Go. Don't paste the key into the source code or GitHub:

```bash
read -rsp 'CarVariables API key: ' CARVARIABLES_API_KEY; echo
export CARVARIABLES_API_KEY
go test ./...
go run .
```

Visit `http://localhost:8080/discover#full-specs`, search for `BMW M3 2008`, then scroll to its search results.

## Diagnosis

If the photos are blank, open another terminal:

```bash
curl -I 'http://localhost:8080/api/velocity/photo?file=car_fb2e7fe275aa7cf62f1600660fa421e072870b18d8fd4f23.avif'
```

- `200 image/avif`: VÉLOCITY successfully fetched an image; hard refresh the browser.
- `503`: your Go server does not have the `CARVARIABLES_API_KEY` environment variable.
- `404`: this particular photo is missing from the provider.
- `429`: provider image request allowance/rate limit reached.
- `502`: provider image request failed or was denied. Check the upstream image status separately, without exposing your key:

```bash
curl -s -o /dev/null -w 'Upstream image status: %{http_code}\n' \
  -H "X-API-Key: $CARVARIABLES_API_KEY" \
  'https://carvariables.com/images/car_fb2e7fe275aa7cf62f1600660fa421e072870b18d8fd4f23.avif'
```

The provider may not have an image for every generation. Photos are model-generation references, **not** photographs of a user's particular car. Collection and homepage photos are separately curated; this repair does not automatically replace them.
