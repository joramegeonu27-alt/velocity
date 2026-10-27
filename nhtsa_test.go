package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNHTSAModelsAndCache(t *testing.T) {
	hits := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		if !strings.Contains(r.URL.Path, "GetModelsForMakeYear/make/Toyota/modelyear/2024") {
			t.Errorf("wrong endpoint: %s", r.URL.String())
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Count":1,"Results":[{"Make_ID":448,"Make_Name":"TOYOTA","Model_ID":2200,"Model_Name":"Camry"}]}`))
	}))
	defer upstream.Close()
	s := newNHTSAService(upstream.URL, upstream.Client())
	for i := 0; i < 2; i++ {
		r := httptest.NewRequest(http.MethodGet, "/api/nhtsa/models?make=Toyota&year=2024", nil)
		w := httptest.NewRecorder()
		s.modelsHandler(w, r)
		if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), "Camry") {
			t.Fatalf("response: %d %s", w.Code, w.Body.String())
		}
	}
	if hits != 1 {
		t.Fatalf("expected one upstream request after caching; got %d", hits)
	}
}

func TestNHTSAInvalidInput(t *testing.T) {
	s := newNHTSAService("http://example.invalid", nil)
	for _, query := range []string{"make=", "make=Toyota&year=1980", "make=Toyota%2Fbad"} {
		w := httptest.NewRecorder()
		s.modelsHandler(w, httptest.NewRequest(http.MethodGet, "/api/nhtsa/models?"+query, nil))
		if w.Code != http.StatusBadRequest {
			t.Errorf("%q status %d", query, w.Code)
		}
	}
}

func TestNHTSADiscoverPage(t *testing.T) {
	w := httptest.NewRecorder()
	discoverHandler(w, httptest.NewRequest(http.MethodGet, "/discover", nil))
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), "Discover vehicle models") {
		t.Fatalf("discover: %d %s", w.Code, w.Body.String())
	}
}
