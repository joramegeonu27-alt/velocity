package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestManufacturerPhotoHeroAndLogoControls(t *testing.T) {
	response := httptest.NewRecorder()
	routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/manufacturers", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("manufacturers returned %d", response.Code)
	}
	body := response.Body.String()
	for _, marker := range []string{"mm-photo-hero", "CURATED WORLDWIDE DIRECTORY", "ONE WORLD.", "ENDLESS MACHINES.", "REAL MODEL RECORDS / GENERATION SPECS"} {
		if !strings.Contains(body, marker) {
			t.Errorf("missing %q", marker)
		}
	}
	if strings.Contains(body, "THE NAMES<br>BEHIND") || strings.Contains(body, "From iconic performance marques") {
		t.Error("old headline remains")
	}
	for _, name := range []string{"static/images/manufacturers-hero.jpg", "static/images/brand-mark-fallback.svg"} {
		if _, err := os.Stat(name); err != nil {
			t.Errorf("missing asset %s: %v", name, err)
		}
	}
	js, err := os.ReadFile("static/js/manufacturers.js")
	if err != nil {
		t.Fatal(err)
	}
	for _, marker := range []string{"logoNode(brand)", "flag(record.code)", "cdn.simpleicons.org", "data-mm-country"} {
		if !strings.Contains(string(js), marker) {
			t.Errorf("missing JS feature %s", marker)
		}
	}
	for _, asset := range []string{"/static/images/manufacturers-hero.jpg", "/static/images/brand-mark-fallback.svg"} {
		response := httptest.NewRecorder()
		routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, asset, nil))
		if response.Code != http.StatusOK {
			t.Errorf("asset %s = %d", asset, response.Code)
		}
	}
}
