# VÉLOCITY Discovery film hero — 2026-10-28

The uploaded portrait video replaces the former static Discovery hero photo.
- `static/videos/discover-hero.mp4`: original user-provided video (no stretching or zoom crop).
- `static/images/discover-film-poster.webp`: still frame from this video for fallback / reduced motion.
- `templates/discover.html`: hero video markup and accessible pause/play button.
- `static/css/discover-premium.css`: warm dark video/heading blending, responsive landscape and portrait treatment.
- `static/js/discover-film.js`: playback control, visibility pausing, reduced-motion support.

The previously used image assets are retained as files in the project for safety, but no longer used by the Discover hero. The Home, Compare, Collection, and API features remain untouched.

Run `go test ./...` then `go run .` and visit `http://localhost:8080/discover`.
