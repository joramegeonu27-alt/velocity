package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestPremiumCompareStudio(t *testing.T) {
	p := request(t, http.MethodGet, "/compare")
	if p.Code != 200 {
		t.Fatalf("compare status %d", p.Code)
	}
	for _, want := range []string{
		"LET THE", "BEST WIN.", "VERSUS STUDIO", "vehicleSearch", "comparisonTable", "differenceOnly", "insightCards", "compare-studio.css", "compare-glass.css", "compare-studio.js", "velocity-logo.webp",
	} {
		if !strings.Contains(p.Body.String(), want) {
			t.Errorf("compare page missing %q", want)
		}
	}
	for _, asset := range []string{"/static/css/compare-studio.css", "/static/css/compare-glass.css", "/static/js/compare-studio.js", "/static/js/compare-glass.js", "/static/images/velocity-logo.webp", "/static/images/compare-rivals.webp"} {
		result := request(t, http.MethodGet, asset)
		if result.Code != 200 {
			t.Errorf("%s returned %d", asset, result.Code)
		}
	}
}

func TestCompareCatalogueSameAsCollection(t *testing.T) {
	p := request(t, http.MethodGet, "/api/compare/catalogue")
	if p.Code != 200 {
		t.Fatalf("status %d", p.Code)
	}
	var cars []Car
	if err := json.Unmarshal(p.Body.Bytes(), &cars); err != nil {
		t.Fatal(err)
	}
	if len(cars) < 2 {
		t.Fatalf("expected 2+ local vehicles, got %d", len(cars))
	}
	for _, car := range cars {
		if car.ID == "" || car.Model == "" || car.Brand == "" {
			t.Fatalf("invalid vehicle %+v", car)
		}
	}
	p = request(t, http.MethodPost, "/api/compare/catalogue")
	if p.Code != http.StatusMethodNotAllowed {
		t.Errorf("POST returned %d", p.Code)
	}
}

func TestDiscoveryHasVINExamplesAndUpdatedCopy(t *testing.T) {
	r := request(t, http.MethodGet, "/discover")
	if r.Code != 200 {
		t.Fatalf("discover status %d", r.Code)
	}
	for _, text := range []string{"02 / VEHICLE INTELLIGENCE", "Know the machine.", "Beyond the badge.", "17-character VIN", "1HGCM82633A004352", "4T1DAACK2SU047491", "1FAHP2E83FG172456", "data-demo-vin", "velocity-logo.webp"} {
		if !strings.Contains(r.Body.String(), text) {
			t.Errorf("missing %q", text)
		}
	}
}

func TestNavigationLogoOnEveryPage(t *testing.T) {
	for _, path := range []string{"/", "/cars", "/compare", "/about", "/discover"} {
		r := request(t, http.MethodGet, path)
		if !strings.Contains(r.Body.String(), "velocity-logo.webp") {
			t.Errorf("logo missing on %s", path)
		}
	}
}
