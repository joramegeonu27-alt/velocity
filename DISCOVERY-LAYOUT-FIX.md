# VÉLOCITY — fixed cinematic Discovery hero

The reported issue was a Discovery-specific CSS load failure: the navigation retained the main site styling but the hero image and all Discovery content fell into normal document flow. The updated Go page now embeds its own, repository-controlled Discovery CSS as a critical style block, and renders the sunset photograph as a CSS background rather than a free-standing image. The design remains bronze/dark and responsive.

## Run

Open **the `velocity` folder containing `main.go`** in a terminal:

```sh
go test ./...
go run .
```

Open `http://localhost:8080/discover` and perform a hard refresh: **Ctrl+Shift+R** (or Cmd+Shift+R on Mac). Ensure you stopped any older `go run .` processes before starting the new one.

## Important for editing

The file `static/css/discover-premium.css` is automatically embedded into the Go binary using `//go:embed`, so CSS and layout stay together. If you edit that file, restart `go run .` to see your changes. The image is self-hosted under `static/images` and can be swapped without modifying the template.

The update does not affect the working NHTSA API, Collection, Compare, or other pages. It has not been pushed to GitHub.
