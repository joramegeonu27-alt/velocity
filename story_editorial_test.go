package main

import (
	"net/http"
	"strings"
	"testing"
)

func TestOurStoryLongform(t *testing.T) {
	response := request(t, http.MethodGet, "/about")
	if response.Code != http.StatusOK {
		t.Fatalf("/about status = %d", response.Code)
	}
	body := response.Body.String()
	expected := []string{
		"OUR", "STORY", "THE STORY BEHIND VÉLOCITY", "OUR PHILOSOPHY",
		"THE VÉLOCITY EXPERIENCE", "INSIDE THE PLATFORM", "Curiosity",
		"Vehicle Intelligence", "Different machines.", "The journey",
		"THE COLLECTION", "story-editorial.css", "story-editorial.js",
		"href=\"/discover#intelligence\"", "href=\"/compare\"", "href=\"/cars\"",
	}
	for _, phrase := range expected {
		if !strings.Contains(strings.ToLower(body), strings.ToLower(phrase)) {
			t.Errorf("/about is missing %q", phrase)
		}
	}
	for _, unwanted := range []string{"about-hero", "inner-hero-background", "philosophy-banner"} {
		if strings.Contains(body, unwanted) {
			t.Errorf("old hero element %q should not appear", unwanted)
		}
	}
}

func TestOurStoryStaticAssets(t *testing.T) {
	paths := []string{
		"/static/css/story-editorial.css", "/static/js/story-editorial.js",
		"/static/images/story-afterdark.webp", "/static/images/story-rolling.webp",
		"/static/images/story-sunset.webp", "/static/images/story-collection.webp",
		"/static/images/story-versus.webp",
	}
	for _, path := range paths {
		response := request(t, http.MethodGet, path)
		if response.Code != http.StatusOK {
			t.Errorf("%s status = %d", path, response.Code)
		}
		if response.Body.Len() == 0 {
			t.Errorf("%s is empty", path)
		}
	}
}
