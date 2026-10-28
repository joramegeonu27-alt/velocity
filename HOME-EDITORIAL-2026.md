# VÉLOCITY Home — Editorial Edition (2026-10-28)

This is a complete Go project. Only the Home page HTML, its dedicated CSS/JS, and the Home page media have been added or changed. All other pages, routes, existing videos, image assets, NHTSA services, and comparison tools are preserved.

## New Home media (provided by the project owner)
- `static/images/home-sunset.webp`: editorial hero photo (figure standing beside a car at dusk)
- `static/images/home-motion-car.webp`: Lamborghini photographed on the road
- `static/images/home-classic.webp`: classic black luxury car
- `static/videos/home-editorial-film.mp4`: compressed version of the uploaded portrait-format film, approximately six seconds, muted and looped; `static/images/home-film-poster.jpg` is its fallback.

Media have been optimized for faster page delivery while keeping each image's proportions. The new film panel is portrait-shaped to avoid stretching landscape video over a wide screen. The original existing `home-hero.mp4` and its poster are retained but no longer used on Home.

## Design
A split editorial hero, a familiar featured catalogue section, a road photography feature, a separate portrait film presentation, clean navigation to Discovery/Collection/Compare/Our Story, and a classic-car photo chapter. Upright bold headings, warm-copper accents, minimal transitions, keyboard-visible focus, and a reduced-motion alternative.

## Running and testing
```bash
go test ./...
go vet ./...
go run .
```
Open http://localhost:8080/ and hard refresh using Ctrl + Shift + R if you previously loaded the old homepage.

If autoplay is blocked, the video displays a local poster. The visitor can use the film Play/Pause button. The film is paused when off-screen to reduce resource use.
