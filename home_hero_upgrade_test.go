package main

import (
	"net/http"
	"os"
	"strings"
	"testing"
)

func TestLuxuryHeroMediaMigration(t *testing.T) {
	home := request(t, http.MethodGet, "/")
	if home.Code != http.StatusOK {
		t.Fatalf("home HTTP %d", home.Code)
	}
	body := home.Body.String()
	for _, token := range []string{"velocityHeroVideo", "home-rivals-hero.mp4", "vh-hero-left-shade", "vh-atelier", "vh-direction", "vh-manifesto", "velocityHeroVideoToggle"} {
		if !strings.Contains(body, token) {
			t.Errorf("home missing %q", token)
		}
	}
	if strings.Contains(body, `<img src="/static/images/home-sunset.webp"`) {
		t.Fatal("former Home hero photo still in home HTML")
	}
	for _, url := range []string{"/static/videos/home-rivals-hero.mp4", "/static/images/home-rivals-poster.jpg", "/static/images/discovery-sunset-hero.webp", "/static/images/discovery-sunset-mobile.webp", "/static/css/home-editorial.css", "/static/css/compare-glass.css"} {
		response := request(t, http.MethodGet, url)
		if response.Code != http.StatusOK {
			t.Errorf("%s returned %d", url, response.Code)
		}
	}
	for _, filepath := range []string{"static/videos/home-rivals-hero.mp4", "static/images/home-sunset.webp", "static/images/discovery-sunset-hero.webp"} {
		info, err := os.Stat(filepath)
		if err != nil || info.Size() < 10000 {
			t.Errorf("missing media %s: %v", filepath, err)
		}
	}
}
