# VÉLOCITY — CarVariables photo and configuration repair

## What was fixed

- The image handler used to refuse the HTTP 301 redirect returned by `carvariables.com/images/...` and returned 502. The photo service now requests the documented image host `cdn.carvariables.com` directly, and its default HTTP client permits only HTTPS image redirects within the CarVariables image domains.
- Image requests no longer send the `CARVARIABLES_API_KEY` credential to the public image host; the secret is only used for the JSON vehicle search API.
- The Gallery now loads photos from `/api/velocity/photo` first and only falls back to the image URL returned by CarVariables if needed. Both `carvariables.com` and `cdn.carvariables.com` `image_url` values are understood.
- Discovery and Compare spec photos also recognize CDN URLs.
- The image endpoint can attempt a public image download even when the JSON API key isn't configured. **The actual car catalogue still REQUIRES the API key.**

## Start VÉLOCITY with your API key

From inside the `velocity` directory:

```sh
./start-velocity.sh
```

This prompts for the key without storing it to disk. Do not put the key in frontend JavaScript or commit it to GitHub. If you use `go run .` instead, set `CARVARIABLES_API_KEY` in the **same terminal** first.

## Verify JSON data

```sh
curl -sS 'http://localhost:8080/api/velocity/vehicles?per=2&variants=1' | python3 -m json.tool
```

If you get `code: not_configured`, restart the server with `./start-velocity.sh`. The missing-key issue happens **before** any request is sent to CarVariables.

## Verify a photo

```sh
curl -sS -o /tmp/velocity-photo.avif -w '%{http_code}\n' 'http://localhost:8080/api/velocity/photo?file=car_fb2e7fe275aa7cf62f1600660fa421e072870b18d8fd4f23.avif'
file /tmp/velocity-photo.avif
```

A successful photo download should be HTTP 200 and have a suitable image format. Do not open the file when the request returned an error, as it will contain an error message rather than an AVIF image.

## Important limitations

- A photo can only render when CarVariables actually provides an image URL and its CDN permits the image request. The free plan may have usage limits, watermarks or attribution requirements.
- This change has been verified with mocked upstream HTTP responses; real downloads must be tested locally with your key and access to the provider.
- Collection's video hero is unchanged, and Collection and Discovery stay browse-only. The Compare page retains its photo-based selection controls.
