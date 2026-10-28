# VÉLOCITY — Home Motion & Discovery Migration (28 October 2026)

## What's new
- `/` hero now uses `static/videos/home-rivals-hero.mp4` (user-provided landscape footage) and `static/images/home-rivals-poster.jpg`.
- A **left-only**, dark espresso-to-transparent overlay protects the copy without dimming the cars on the right. The video is silent, looped, and provides a Play/Pause control with reduced-motion support.
- The former Home photograph `static/images/home-sunset.webp` is **preserved** and copied over the Discovery hero assets `discovery-sunset-hero.webp` and `discovery-sunset-mobile.webp`. The previous Discovery sunset panorama was replaced.
- The Compare hero photo is unchanged; a tasteful CSS dark vignette is added around its edges in `static/css/compare-glass.css`.
- Home expands with an interactive catalogue-backed showroom browser, three working experience previews, an editorial manifesto, and subtle scroll reveals.
- All updates are local to Home and its media except Discovery hero imagery and Compare vignette.

## Start
From the `velocity` directory:

```sh
go test ./...
go run .
```

Visit `/`, `/discover`, and `/compare`. Refresh with Ctrl+Shift+R if you had an older stylesheet cached.

## Data & media
The showroom catalogue is editorial/sample data already shipped with VÉLOCITY; stats should not be treated as certified trim-specific values. VIN decoding and make/model research continue through existing backend APIs. Media files are local: no external API needed for the hero.
