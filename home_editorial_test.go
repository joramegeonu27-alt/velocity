package main

import (
	"net/http"
	"os"
	"strings"
	"testing"
)

func TestHomeEditorialMediaAndNavigation(t *testing.T) {
	res := request(t, http.MethodGet, "/")
	if res.Code != http.StatusOK {
		t.Fatalf("homepage status %d", res.Code)
	}
	html := res.Body.String()
	for _, want := range []string{
		"home-editorial.css", "home-editorial.js", "home-rivals-hero.mp4",
		"home-motion-car.webp", "home-classic.webp", "home-editorial-film.mp4",
		"home-film-poster.jpg", "THE ROAD", "05 / THE EXPERIENCE",
		"THE FINER DETAILS", "homeEditorialVideoToggle", "BEYOND SPEED.",
		"BEYOND ORDINARY.", "AUTOMOTIVE EXCELLENCE.",
		"href=\"/discover\"", "href=\"/cars\"", "href=\"/compare\"", "href=\"/about\"",
	} {
		if !strings.Contains(html, want) {
			t.Errorf("missing %s", want)
		}
	}
	for _, asset := range []string{
		"/static/css/home-editorial.css", "/static/js/home-editorial.js",
		"/static/images/home-rivals-poster.jpg", "/static/images/home-motion-car.webp",
		"/static/images/home-classic.webp", "/static/images/home-film-poster.jpg",
		"/static/videos/home-editorial-film.mp4",
	} {
		res := request(t, http.MethodGet, asset)
		if res.Code != http.StatusOK {
			t.Errorf("asset %s status = %d", asset, res.Code)
		}
	}
	for _, relative := range []string{
		"static/images/home-rivals-poster.jpg", "static/images/home-motion-car.webp", "static/images/home-classic.webp", "static/videos/home-editorial-film.mp4",
	} {
		info, err := os.Stat(relative)
		if err != nil || info.Size() < 1000 {
			t.Errorf("missing or empty local media file %s: %v", relative, err)
		}
	}
}
