# VÉLOCITY Discovery — your sunset hero photograph

The photograph supplied in chat is now fully integrated into `/discover` as a cinematic, responsive, locally hosted hero image.

## What's new

- Full-width cinematic photo across the entire hero section, with the supercar on the left and editorial headline on the right (desktop).
- Bronze/dark gradient blending, legible typography, subtle photo reveal and responsive layout.
- Mobile-specific optimized image, with the car visible below the headline.
- No placeholder frame or stock photo in the Discovery hero.
- Your exact original PNG retained as `static/images/discovery-sunset-original.png`.
- Existing VÉLOCITY pages, styles, routes, NHTSA integration and research features retained.

## Run

From inside the `velocity` folder:

```sh
go test ./...
go run .
```

Visit: http://localhost:8080/discover

## If you want to change the photo later

Edit `static/images/discovery-sunset-hero.webp` and `static/images/discovery-sunset-mobile.webp` or update the `picture` element in `templates/discover.html`. Layout and blending are at the end of `static/css/discover-premium.css`.

## Source note

This complete archive continues the earlier reconstructed VÉLOCITY Go project. It has not been independently verified as an exact copy of your newest GitHub commit. No changes have been made to your GitHub repository.
