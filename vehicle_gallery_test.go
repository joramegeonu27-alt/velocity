package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLiveVehicleGalleryOnAllThreePages(t *testing.T) {
	for _, path := range []string{"/cars", "/discover", "/compare"} {
		t.Run(path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, path, nil)
			response := httptest.NewRecorder()
			routes().ServeHTTP(response, request)
			if response.Code != http.StatusOK {
				t.Fatalf("page %s returned %d: %s", path, response.Code, response.Body.String())
			}
			body := response.Body.String()
			for _, marker := range []string{"data-velocity-gallery", "data-vg-interface", "/static/js/vehicle-gallery.js", "/static/css/vehicle-gallery.css", "VEHICLE"} {
				if !strings.Contains(body, marker) {
					t.Errorf("%s missing gallery marker %q", path, marker)
				}
			}
		})
	}
}

func TestVehicleGalleryAssetsServed(t *testing.T) {
	for _, path := range []string{"/static/css/vehicle-gallery.css", "/static/js/vehicle-gallery.js"} {
		response := httptest.NewRecorder()
		routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusOK || response.Body.Len() == 0 {
			t.Errorf("asset %s returned %d and %d bytes", path, response.Code, response.Body.Len())
		}
	}
}
