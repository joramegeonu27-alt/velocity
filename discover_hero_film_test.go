package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestDiscoveryVideoHeroAndControls(t *testing.T) {
	rec := httptest.NewRecorder()
	routes().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/discover", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("/discover returned %d", rec.Code)
	}
	page := rec.Body.String()
	for _, expected := range []string{"id=\"discoverHeroVideo\"", "id=\"discoverFilmToggle\"", "/static/videos/discover-hero.mp4", "discover-film-poster.webp", "discover-film.js?v=20261028-motion"} {
		if !strings.Contains(page, expected) {
			t.Errorf("missing video hero detail: %q", expected)
		}
	}
	if strings.Contains(page, "discovery-sunset-hero.webp") {
		t.Errorf("previous static photo still referenced on Discovery")
	}
}

func TestDiscoveryVideoAssets(t *testing.T) {
	for _, asset := range []string{"/static/videos/discover-hero.mp4", "/static/images/discover-film-poster.webp", "/static/js/discover-film.js", "/static/css/discover-premium.css"} {
		rec := httptest.NewRecorder()
		routes().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, asset, nil))
		if rec.Code != http.StatusOK {
			t.Errorf("asset %s returned %d", asset, rec.Code)
		}
	}
	if s, err := os.Stat("static/videos/discover-hero.mp4"); err != nil || s.Size() == 0 {
		t.Fatalf("missing hero film: %v", err)
	}
}
