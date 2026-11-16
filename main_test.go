package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func request(t *testing.T, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	t.Setenv("VEHICLES_API_KEY", "")
	recorder := httptest.NewRecorder()
	routes().ServeHTTP(recorder, httptest.NewRequest(method, path, nil))
	return recorder
}

func TestPublicPagesRender(t *testing.T) {
	cases := []struct{ path, text string }{
		{"/", "BEYOND SPEED."},
		{"/cars", "BROWSE THE COLLECTION."},
		{"/cars/bmw-m4", "M4 Competition"},
		{"/compare", "FIND YOUR NEXT RIVAL."},
		{"/about", "ABOUT"},
	}
	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			response := request(t, http.MethodGet, tc.path)
			if response.Code != http.StatusOK {
				t.Fatalf("status = %d: %s", response.Code, response.Body.String())
			}
			if !strings.Contains(response.Body.String(), tc.text) {
				t.Fatalf("response missing %q", tc.text)
			}
			if got := response.Header().Get("Content-Type"); !strings.HasPrefix(got, "text/html") {
				t.Errorf("content type = %q", got)
			}
		})
	}
}

// The Collection page now renders CarVariables results in the browser; the
// server-side legacy car archive remains usable by its existing detail URLs.
func TestCatalogueSearchSortPagination(t *testing.T) {
	for _, path := range []string{"/cars", "/cars?q=Porsche", "/cars?brand=BMW", "/cars?page=2"} {
		response := request(t, http.MethodGet, path)
		if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "data-velocity-gallery") {
			t.Fatalf("live Collection missing on %s", path)
		}
		if strings.Contains(response.Body.String(), `id="vehicleGrid"`) {
			t.Fatalf("legacy car photo gallery visible on %s", path)
		}
	}
	cars, err := loadCars()
	if err != nil {
		t.Fatal(err)
	}
	sorted := filterAndSort(cars, "", "", "power")
	for i := 1; i < len(sorted); i++ {
		if sorted[i-1].Horsepower < sorted[i].Horsepower {
			t.Fatal("power sort incorrect")
		}
	}
}

func TestErrorResponses(t *testing.T) {
	for _, path := range []string{"/missing", "/cars/no-car", "/cars/a/b", "/about/extra"} {
		if response := request(t, http.MethodGet, path); response.Code != http.StatusNotFound {
			t.Errorf("%s returned %d, want 404", path, response.Code)
		}
	}
	if response := request(t, http.MethodPost, "/cars"); response.Code != 405 || response.Header().Get("Allow") != "GET, HEAD" {
		t.Errorf("POST /cars returned %d", response.Code)
	}
	if response := request(t, http.MethodGet, "/healthz"); response.Code != 200 {
		t.Errorf("healthz returned %d", response.Code)
	}
}

func TestSpecificationsEndpoint(t *testing.T) {
	response := request(t, http.MethodGet, "/api/compare/specs?vin=bmw-m4")
	if response.Code != 200 {
		t.Fatalf("specs returned %d", response.Code)
	}
	var payload map[string]string
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload["engine_hp"] != "503" || payload["make"] != "BMW" {
		t.Errorf("unexpected specs: %v", payload)
	}
	if response := request(t, http.MethodGet, "/api/compare/specs"); response.Code != 400 {
		t.Errorf("empty VIN returned %d", response.Code)
	}
	if response := request(t, http.MethodGet, "/api/compare/specs?vin=unknown"); response.Code != 404 {
		t.Errorf("unknown car returned %d", response.Code)
	}
}

func TestFilteringLogic(t *testing.T) {
	input := []Car{{ID: "a", Brand: "BMW", Model: "M4", Horsepower: 500, Year: 2024}, {ID: "b", Brand: "Audi", Model: "RS 7", Horsepower: 600, Year: 2025}}
	if got := filterAndSort(input, "audi", "", "featured"); len(got) != 1 || got[0].ID != "b" {
		t.Errorf("search result %v", got)
	}
	if got := filterAndSort(input, "", "BMW", "featured"); len(got) != 1 || got[0].ID != "a" {
		t.Errorf("brand result %v", got)
	}
	if got := filterAndSort(input, "", "", "power"); got[0].ID != "b" {
		t.Errorf("power sort result %v", got)
	}
	if got := filterAndSort(input, "", "", "name"); got[0].ID != "b" {
		t.Errorf("name sort result %v", got)
	}
}

func TestPremiumHomepageAndAssets(t *testing.T) {
	response := request(t, http.MethodGet, "/")
	if response.Code != http.StatusOK {
		t.Fatalf("homepage status = %d", response.Code)
	}
	body := response.Body.String()
	for _, expected := range []string{
		"WELCOME TO THE EXTRAORDINARY",
		"BEYOND SPEED.", "BEYOND ORDINARY.", "AUTOMOTIVE EXCELLENCE.",
		"signal-beacon",
		"05 / THE EXPERIENCE",
		"home-motion.js",
		"home-premium.css",
		"featured-exotic.svg",
		"THE FINER DETAILS",
		"THE ROAD",
	} {
		if !strings.Contains(body, expected) {
			t.Errorf("homepage missing %q", expected)
		}
	}
	for _, asset := range []string{
		"/static/css/home-premium.css",
		"/static/js/home-motion.js",
		"/static/images/featured-exotic.svg",
	} {
		if assetResponse := request(t, http.MethodGet, asset); assetResponse.Code != http.StatusOK {
			t.Errorf("%s status = %d", asset, assetResponse.Code)
		}
	}
}

func TestPremiumCollectionVideoAndAssets(t *testing.T) {
	response := request(t, http.MethodGet, "/cars")
	if response.Code != http.StatusOK {
		t.Fatalf("collection status = %d", response.Code)
	}
	for _, expected := range []string{"collectionHeroVideo", "/static/videos/collection-hero.mp4", "velocity-premium.css", "data-velocity-gallery", "vehicle-gallery.js", "live-collection"} {
		if !strings.Contains(response.Body.String(), expected) {
			t.Errorf("collection missing %q", expected)
		}
	}
	for _, asset := range []string{"/static/videos/collection-hero.mp4", "/static/images/collection-poster.jpg", "/static/css/velocity-premium.css", "/static/js/cars.js"} {
		result := request(t, http.MethodGet, asset)
		if result.Code != http.StatusOK {
			t.Errorf("asset %q status = %d", asset, result.Code)
		}
	}
}
