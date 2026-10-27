package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDiscoveryInlineStylesAndHeroBackground(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/discover", nil)
	res := httptest.NewRecorder()
	routes().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("discovery status=%d: %s", res.Code, res.Body.String())
	}
	body := res.Body.String()
	for _, fragment := range []string{"id=\"velocity-discovery-styles\"", "background-image:url('/static/images/discovery-sunset-hero.webp')", "class=\"dx-hero-photo\"", "class=\"dx-hero-copy\"", "dx-hero-grid", "Vehicle intelligence", "discover-premium.js?v=20261027-fix2"} {
		if !strings.Contains(body, fragment) {
			t.Errorf("Discovery response missing %q", fragment)
		}
	}
	if strings.Contains(body, "<picture>") {
		t.Error("photo must not be a standalone picture element")
	}
}

func TestDiscoveryAssetsReturnImages(t *testing.T) {
	for _, url := range []string{"/static/images/discovery-sunset-hero.webp", "/static/images/discovery-sunset-mobile.webp", "/static/js/discover-premium.js"} {
		res := httptest.NewRecorder()
		routes().ServeHTTP(res, httptest.NewRequest(http.MethodGet, url, nil))
		if res.Code != http.StatusOK {
			t.Errorf("asset %s returned status %d", url, res.Code)
		}
	}
}
