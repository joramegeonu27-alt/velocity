# VÉLOCITY — Our Story / Editorial Edition

## What's new

The `/about` route is redesigned as a long, deliberately **hero-free** editorial story. The introduction begins immediately with `OUR STORY` typography and writing, **not** a hero image, banner, video, or image background. The rest of the platform is unchanged.

Sections: Story Behind VÉLOCITY, Philosophy, VÉLOCITY Experience, the platform's four page entry points, Discovery, the Collection, Vehicle Intelligence, Comparison, and the Journey Continues.

Design: spacious dark editorial layouts, one warm light editorial chapter, varied photography placement, copper details, gentle hover effects, a sticky section index, scroll progress, subtle scroll reveals and a keyboard-accessible interactive four-part timeline. Respects reduced-motion preferences.

## Files changed or added

- `templates/about.html` — rebuilt, semantic editorial content and page links.
- `static/css/story-editorial.css` — styles scoped to `.page-story-editorial`, loaded after existing CSS.
- `static/js/story-editorial.js` — subtle motion, progress, section index and timeline.
- `static/images/story-{afterdark,rolling,sunset,collection,versus}.webp` — optimized editorial variants of car photography already in this project. No third-party image dependency.
- `story_editorial_test.go` — checks route content and bundled static assets.

No Go routes or API integration logic were changed.

## Run

In the `velocity/` directory:

```sh
go test ./...
go run .
```

Open `http://localhost:8080/about`. Refresh the browser with Ctrl+Shift+R if you were using an older About page.

The introduction is image-free by design. Cinematic photos only appear **inside later editorial sections**.

## Source and limitations

Built on the most recent **complete project ZIP in this conversation**, not on a verified download of the latest GitHub commit. All existing source files were preserved and the website's original `/about` route remains in place. Live external API responses were not retested; this redesign introduces no new external API calls.
