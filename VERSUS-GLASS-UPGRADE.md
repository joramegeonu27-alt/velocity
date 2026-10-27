# VÉLOCITY — Versus Studio / glass hero upgrade

This release replaces only the Compare page hero and adds a bronze liquid-glass-inspired styling layer throughout `/compare`.

## The new hero
- Uses the car photograph supplied in the conversation, optimized into `static/images/compare-rivals.webp` (about 160 KB).
- New competitive caption: **LET THE BEST WIN.**
- Full-width head-to-head photographic composition, copper accents, floating translucent glass command deck, animated background, glowing details and scroll links.
- Responsive layout including mobile, with reduced-motion preferences supported.
- No other page heroes are changed.

## Glass-style elements across the Compare page
The new `compare-glass.css` decorates vehicle search controls, three-vehicle picker, results/battle cards, specification groups, insights, charts, trending matchups, history, action buttons and form fields. It does not replace or remove any controls or API functionality from `compare-studio.js`.

## Start the project

From inside the `velocity` folder:

```sh
go test ./...
go run .
```

Visit http://localhost:8080/compare and refresh with Ctrl+Shift+R if you used an older version (the new CSS/JS includes a changed cache-busting query).

## Modified files

- `templates/compare.html` — new hero markup, links to style and motion scripts.
- `static/css/compare-glass.css` — hero layout, glass surfaces, responsive styling, motion controls.
- `static/js/compare-glass.js` — optional pointer-follow spotlight, progressive appearance.
- `static/images/compare-rivals.webp` — user-provided hero picture compressed for web.
- `compare_studio_test.go` — tests for the new caption and static assets.

No changes are required to Go handlers, data, NHTSA/VIN APIs, Collection, Discovery, Home or other existing pages.

## Verification and limitations

- `go test ./...` and `go vet ./...` pass in the provided complete project.
- `node --check` passes for both Compare JS files.
- Isolated Chromium desktop (1440px), mobile (390px), tablet (768px) tests: zero horizontal page overflow, no JS page errors, three-car selector loads nine catalogue cards, two-car comparison opens with 32 specification table rows. The browser preview is isolated and mocks catalogue network calls rather than checking live third-party systems.
- No exact recreation of Apple-proprietary iOS UI is claimed; the design is inspired by layered, translucent glass interfaces.

This full project ZIP is based on the last complete VÉLOCITY source archive available in this conversation, not a byte-for-byte verified clone of your current GitHub main branch. If you made additional changes locally, use the update-only ZIP to patch just the Compare page instead of replacing your project.
