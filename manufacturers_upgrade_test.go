package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestManufacturersRouteAndNavigation(t *testing.T) {
	paths := []string{"/", "/cars", "/discover", "/compare", "/about", "/manufacturers"}
	for _, path := range paths {
		response := httptest.NewRecorder()
		routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusOK {
			t.Fatalf("GET %s = %d", path, response.Code)
		}
		if !strings.Contains(response.Body.String(), "href=\"/manufacturers\"") {
			t.Errorf("%s missing Manufacturers nav link", path)
		}
	}
	response := httptest.NewRecorder()
	routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/manufacturers", nil))
	if !strings.Contains(response.Body.String(), "data-mm-model-grid") || !strings.Contains(response.Body.String(), "manufacturers.js") {
		t.Error("Manufacturers page must include live model generation UI")
	}
}

func TestSplitGalleryAndPreservedHero(t *testing.T) {
	response := httptest.NewRecorder()
	routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/cars", nil))
	body := response.Body.String()
	for _, marker := range []string{"collectionHeroVideo", "collection-hero.mp4", "data-gallery-mode=\"collection\"", "20261116-split", "20261116-softlight"} {
		if !strings.Contains(body, marker) {
			t.Errorf("Collection missing %q", marker)
		}
	}
	js, err := os.ReadFile("static/js/vehicle-gallery.js")
	if err != nil {
		t.Fatal(err)
	}
	for _, marker := range []string{"data-vg-view", "vg-inspector", "showInspector", "dimensions", "timeline", "velocity:add-car", "/api/velocity/photo?file="} {
		if !strings.Contains(string(js), marker) {
			t.Errorf("gallery script missing %q", marker)
		}
	}
	if !strings.Contains(string(js), "if (mode !== 'compare') return;") {
		t.Fatal("Comparison must stay exclusive to Compare")
	}
}

func TestManufacturerAssetsServed(t *testing.T) {
	for _, asset := range []string{"/static/js/manufacturers.js", "/static/css/manufacturers.css"} {
		resp := httptest.NewRecorder()
		routes().ServeHTTP(resp, httptest.NewRequest(http.MethodGet, asset, nil))
		if resp.Code != http.StatusOK || resp.Body.Len() < 100 {
			t.Errorf("%s returned HTTP %d (%d bytes)", asset, resp.Code, resp.Body.Len())
		}
	}
}
