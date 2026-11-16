package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Requested change: no unrelated baked-in photo panels on vehicle browsing pages.
func TestLiveOnlyCarPhotographyOnAllThreePages(t *testing.T) {
	for _, name := range []string{"cars.html", "discover.html", "compare.html"} {
		b, err := os.ReadFile(filepath.Join("templates", name))
		if err != nil {
			t.Fatal(err)
		}
		html := string(b)
		if strings.Contains(html, "/static/images/vehicle-editorial/") {
			t.Errorf("%s still has old photo panels", name)
		}
		if !strings.Contains(html, "data-velocity-gallery") {
			t.Errorf("%s missing CarVariables gallery", name)
		}
	}
	b, err := os.ReadFile("static/js/vehicle-gallery.js")
	if err != nil {
		t.Fatal(err)
	}
	for _, marker := range []string{"/api/velocity/search", "/api/velocity/vehicles", "vg-photo-button", "velocity:add-car", "data-vg-more"} {
		if !strings.Contains(string(b), marker) {
			t.Errorf("live gallery missing %s", marker)
		}
	}
	s, err := os.ReadFile("static/js/compare-studio.js")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(s), "await fetch('/api/compare/catalogue'") {
		t.Error("old showroom data still loads into the live Compare picker")
	}
}
