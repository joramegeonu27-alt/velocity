package main

import (
	"net/http"
	"os"
	"strings"
	"testing"
)

func TestRefinedCompareHeroKeepsFullImage(t *testing.T) {
	resp := request(t, http.MethodGet, "/compare")
	if resp.Code != http.StatusOK {
		t.Fatalf("compare page returned %d", resp.Code)
	}
	body := resp.Body.String()
	for _, phrase := range []string{
		"vc-editorial-media", "compare-rivals.webp", "LET THE", "BEST WIN.",
		"vehicleSearch", "compareNow", "comparisonTable", "insightCards",
	} {
		if !strings.Contains(body, phrase) {
			t.Errorf("compare missing %q", phrase)
		}
	}
	if strings.Contains(body, "vc-duel-backdrop") {
		t.Error("obsolete zooming backdrop remains in hero")
	}
	css, err := os.ReadFile("static/css/compare-glass.css")
	if err != nil {
		t.Fatal(err)
	}
	for _, rule := range []string{"object-fit:contain", "height:auto", "transform:none!important"} {
		if !strings.Contains(string(css), rule) {
			t.Errorf("hero CSS missing %q", rule)
		}
	}
}
