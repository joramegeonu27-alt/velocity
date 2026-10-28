package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestVehicleIntelligenceBackends(t *testing.T) {
	var vinHits atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.Contains(r.URL.Path, "DecodeVinValuesExtended"):
			vinHits.Add(1)
			_, _ = w.Write([]byte(`{"Results":[{"Make":"TOYOTA","Model":"Corolla","ModelYear":"2024","BodyClass":"Sedan/Saloon","FuelTypePrimary":"Gasoline","TransmissionStyle":"Automatic","DriveType":"FWD/Front-Wheel Drive","ErrorCode":"0"}]}`))
		case strings.Contains(r.URL.Path, "recallsByVehicle"):
			_, _ = w.Write([]byte(`{"Count":1,"results":[{"Component":"AIR BAGS","Summary":"Test recall"}]}`))
		case strings.Contains(r.URL.Path, "VehicleId"):
			_, _ = w.Write([]byte(`{"Count":1,"Results":[{"OverallRating":"5"}]}`))
		case strings.Contains(r.URL.Path, "SafetyRatings"):
			_, _ = w.Write([]byte(`{"Count":1,"Results":[{"VehicleId":7321,"VehicleDescription":"Toyota Corolla"}]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()
	gateway := newDiscoveryGateway(upstream.Client(), upstream.URL, upstream.URL)
	queries := []struct {
		path    string
		handler http.HandlerFunc
		want    int
		body    string
	}{
		{"/api/discovery/vin?vin=1HGCM82633A004352", gateway.vinHandler, 200, "TOYOTA"},
		{"/api/discovery/vin?vin=1HGCM82633A004352", gateway.vinHandler, 200, "Gasoline"},
		{"/api/discovery/recalls?make=Toyota&model=Corolla&year=2024", gateway.recallsHandler, 200, "AIR BAGS"},
		{"/api/discovery/safety?make=Toyota&model=Corolla&year=2024", gateway.safetyHandler, 200, "7321"},
		{"/api/discovery/rating?id=7321", gateway.ratingHandler, 200, "OverallRating"},
		{"/api/discovery/vin?vin=INVALID", gateway.vinHandler, 400, "VIN"},
		{"/api/discovery/recalls?make=Toyota&model=Corolla&year=100", gateway.recallsHandler, 400, "year"},
		{"/api/discovery/safety?make=Toyota&model=Corolla%2Fbad&year=2024", gateway.safetyHandler, 400, "valid"},
		{"/api/discovery/rating?id=-1", gateway.ratingHandler, 400, "reference"},
	}
	for _, test := range queries {
		rec := httptest.NewRecorder()
		test.handler.ServeHTTP(rec, httptest.NewRequest("GET", test.path, nil))
		if rec.Code != test.want || !strings.Contains(rec.Body.String(), test.body) {
			t.Errorf("%s code %d body %s", test.path, rec.Code, rec.Body.String())
		}
	}
	if vinHits.Load() != 1 {
		t.Errorf("cached VIN requests should trigger one upstream call, got %d", vinHits.Load())
	}
}
func TestIntelligenceDisallowsPost(t *testing.T) {
	gateway := newDiscoveryGateway(nil, "http://example.invalid", "http://example.invalid")
	rec := httptest.NewRecorder()
	gateway.vinHandler(rec, httptest.NewRequest("POST", "/api/discovery/vin?vin=1HGCM82633A004352", nil))
	if rec.Code != 405 {
		t.Fatalf("POST should be disallowed: %d", rec.Code)
	}
}
func TestDiscoveryIncludesSuppliedHeroVideo(t *testing.T) {
	rec := httptest.NewRecorder()
	routes().ServeHTTP(rec, httptest.NewRequest("GET", "/discover", nil))
	body := rec.Body.String()
	for _, s := range []string{"discover-hero.mp4", "dx-hero-film", "/static/css/style.css", "Vehicle Intelligence", "/static/js/discover-premium.js"} {
		if !strings.Contains(body, s) {
			t.Errorf("discover page missing %s", s)
		}
	}
	for _, s := range []string{"heroPhotoSlot", "YOUR SHOT.", "discover-editorial.jpg", "NHTSA DATABASE"} {
		if strings.Contains(body, s) {
			t.Errorf("unexpected legacy UI %s", s)
		}
	}
}
