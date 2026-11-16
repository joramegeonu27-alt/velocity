package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestCollectionPhotoCatalogueUpgrade(t *testing.T) {
	response := httptest.NewRecorder()
	routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/cars", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("/cars HTTP %d", response.Code)
	}
	body := response.Body.String()
	for _, marker := range []string{"collection-hero.mp4", "collectionHeroVideo", "data-gallery-mode=\"collection\"", "data-vg-interface", "vehicle-gallery.js?v=20261115-photo-repair", "BROWSE THE COLLECTION."} {
		if !strings.Contains(body, marker) {
			t.Errorf("missing collection marker %q", marker)
		}
	}
	if strings.Contains(body, "data-gallery-mode=\"compare\"") {
		t.Fatal("Collection must remain browse-only")
	}
	javascript, err := os.ReadFile("static/js/vehicle-gallery.js")
	if err != nil {
		t.Fatal(err)
	}
	for _, marker := range []string{"data-vg-make", "name=\"sort\"", "vg-compact-stats", "vg-model-years", "VIEW ALL SPECIFICATIONS", "mode==='collection'?'18':'9'"} {
		if !strings.Contains(string(javascript), marker) {
			t.Errorf("catalogue script missing %q", marker)
		}
	}
}
