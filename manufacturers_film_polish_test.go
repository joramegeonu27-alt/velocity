package main

import (
	"os"
	"strings"
	"testing"
)

func TestManufacturerAndFilmPolish(t *testing.T) {
	checks := map[string][]string{
		"templates/manufacturers.html":   {"mm-hero-story", "BEHIND EVERY BADGE", "ONE WORLD.", "ENDLESS MACHINES."},
		"templates/about.html":           {"FIVE EXPERIENCES.", "href=\"/manufacturers\""},
		"templates/index.html":           {"<strong>MANUFACTURERS</strong>", "href=\"/manufacturers\""},
		"static/css/vehicle-gallery.css": {"rgba(255,197,135,.115)"},
	}
	for f, parts := range checks {
		b, e := os.ReadFile(f)
		if e != nil {
			t.Fatal(e)
		}
		for _, part := range parts {
			if !strings.Contains(string(b), part) {
				t.Errorf("%s missing %q", f, part)
			}
		}
	}
	for _, f := range []string{"templates/index.html", "templates/cars.html", "templates/discover.html"} {
		b, e := os.ReadFile(f)
		if e != nil {
			t.Fatal(e)
		}
		for _, word := range []string{"velocityHeroVideoToggle", "homeEditorialVideoToggle", "collectionVideoToggle", "discoverFilmToggle", "FILM / PLAYING"} {
			if strings.Contains(string(b), word) {
				t.Errorf("%s still shows control %s", f, word)
			}
		}
	}
}
