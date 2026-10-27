package main

import (
	_ "embed"
	"html/template"
	"net/http"
)

//go:embed static/css/discover-premium.css
var discoveryStyles string

// discoverPremiumHandler renders the NHTSA experience using the same template
// loader as the rest of VÉLOCITY. It leaves the working API handlers untouched.
func discoverPremiumHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/discover" {
		pageNotFound(w, r)
		return
	}
	if !allowGet(w, r) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	render(w, "discover.html", PageData{
		Active:       "discover",
		DiscoveryCSS: template.CSS(discoveryStyles),
		Title:        "Discovery / Vehicle Intelligence — VÉLOCITY",
		Description:  "VÉLOCITY Discovery and Vehicle Intelligence: research manufacturers, models, VIN specifications, safety and recalls.",
	})
}
