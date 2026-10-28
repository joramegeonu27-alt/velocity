# VÉLOCITY — Photo & Typography Edition

This complete Go project is based on the latest VÉLOCITY full project ZIP from this conversation (`velocity-story.zip`). Your GitHub repository has not been modified.

## Images

All five photos were supplied by the user. No replacements were generated or downloaded.

- Compare hero: `static/images/compare-rivals.webp` — original upload `pexels-oli-liao-883836674-28914536.jpg`. The image is displayed at natural aspect ratio without CSS zoom or cropping.
- Our Story, first image: `static/images/story-afterdark.webp` — `pexels-oli-liao-883836674-35628845.jpg` (tunnel scene).
- Our Story, full-width editorial interlude: `static/images/story-rolling.webp` — `pexels-introspectivedsgn-5158085.jpg` (blue car).
- Our Story, discovery editorial: `static/images/story-sunset.webp` — `pexels-bylukemiller-29566891.jpg` (cabin).
- Our Story, collection editorial: `static/images/story-collection.webp` — `pexels-04iraq-29098432.jpg` (red car).
- Our Story, perspective editorial: `static/images/story-versus.webp` — reused tunnel scene, to avoid introducing an unrequested fifth story photograph.

Each image is stored locally as a high-quality WebP asset. No other photography is used on the Our Story page, and the introduction remains image-free (there is no hero section).

## Typography

`static/css/typography-refined.css` is linked last on every page. Display headings are upright, bold, and uppercase; accent text stays copper but is never italicized. Paragraph and data-table copy retain natural capitalization.

## Running locally

```bash
go test ./...
go vet ./...
go run .
```

Browse `/compare` and `/about` to see the updated photography. Other pages share the new heading typography without changes to their business logic.
