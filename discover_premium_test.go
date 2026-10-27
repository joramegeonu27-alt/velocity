package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestDiscoverPremiumRoute(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/discover", nil)
	recorder := httptest.NewRecorder()
	routes().ServeHTTP(recorder, req)
	result := recorder.Result()
	defer result.Body.Close()
	body, _ := io.ReadAll(result.Body)
	if result.StatusCode != http.StatusOK {
		t.Fatalf("/discover status = %d; body=%s", result.StatusCode, body)
	}
	for _, want := range []string{"CURIOSITY", "discoveryForm", "discover-premium.css", "Vehicle Intelligence", "discovery-sunset-hero.webp"} {
		if !strings.Contains(string(body), want) {
			t.Errorf("page missing %q", want)
		}
	}
}

func TestDiscoverPremiumAssets(t *testing.T) {
	for _, name := range []string{
		"templates/discover.html",
		"static/css/discover-premium.css",
		"static/js/discover-premium.js",
		"static/images/discovery-sunset-hero.webp",
		"static/images/discovery-sunset-mobile.webp",
	} {
		if _, err := os.Stat(name); err != nil {
			t.Errorf("missing asset %s: %v", name, err)
		}
	}
}
