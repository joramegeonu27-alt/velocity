package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

const testCarVariablesResponse = `{"success":true,"data":{"total":1,"page":1,"pages":1,"results":[{"code":"029sc4yvet","model":"M3","make":{"name":"BMW"},"variants":[{"id":4796,"power_hp":420}]}]},"api":{"authentication":"NEVER REVEAL"}}`

func TestCarVariablesProxyKeepsKeyPrivateAndCaches(t *testing.T) {
	t.Setenv("CARVARIABLES_API_KEY", "cv_test_only")
	var count atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count.Add(1)
		if r.URL.Path != "/v1/search" {
			t.Errorf("wrong path %q", r.URL.Path)
		}
		if got := r.Header.Get("X-API-Key"); got != "cv_test_only" {
			t.Errorf("invalid key header %q", got)
		}
		if got := r.URL.Query().Get("q"); got != "BMW M3 2008" {
			t.Errorf("wrong query %q", got)
		}
		if r.URL.Query().Get("variants") != "1" {
			t.Error("variants not forwarded")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(testCarVariablesResponse))
	}))
	defer upstream.Close()
	gateway := newCarVariablesGateway(upstream.Client(), upstream.URL)
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/api/velocity/search?q=BMW+M3+2008&variants=1", nil)
		gateway.handler(true)(w, r)
		if w.Code != 200 {
			t.Fatalf("status=%d body=%s", w.Code, w.Body)
		}
		if strings.Contains(w.Body.String(), "NEVER REVEAL") || strings.Contains(w.Body.String(), "cv_test_only") {
			t.Fatal("proxy exposed upstream metadata or secret")
		}
		var data struct {
			Success bool `json:"success"`
			Data    struct {
				Results []struct {
					Model    string `json:"model"`
					Variants []struct {
						PowerHP int `json:"power_hp"`
					} `json:"variants"`
				} `json:"results"`
			} `json:"data"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &data); err != nil || !data.Success || data.Data.Results[0].Variants[0].PowerHP != 420 {
			t.Fatalf("malformed proxy output: %s", w.Body)
		}
	}
	if count.Load() != 1 {
		t.Fatalf("cache should prevent duplicate requests, got %d", count.Load())
	}
}

func TestCarVariablesFilteredSearch(t *testing.T) {
	t.Setenv("CARVARIABLES_API_KEY", "cv_test_only")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/cars" || r.URL.Query().Get("make") != "Porsche" || r.URL.Query().Get("drive") != "awd" {
			t.Errorf("bad filtered query: %s", r.URL)
		}
		_, _ = w.Write([]byte(testCarVariablesResponse))
	}))
	defer server.Close()
	g := newCarVariablesGateway(server.Client(), server.URL)
	w := httptest.NewRecorder()
	g.handler(false)(w, httptest.NewRequest("GET", "/api/velocity/vehicles?make=Porsche&drive=awd&variants=1", nil))
	if w.Code != 200 {
		t.Fatalf("status=%d body=%s", w.Code, w.Body)
	}
}

func TestCarVariablesMissingKeyAndInvalidInput(t *testing.T) {
	t.Setenv("CARVARIABLES_API_KEY", "")
	g := newCarVariablesGateway(nil, "https://api.carvariables.com")
	w := httptest.NewRecorder()
	g.handler(true)(w, httptest.NewRequest("GET", "/api/velocity/search?q=BMW", nil))
	if w.Code != 503 || !strings.Contains(w.Body.String(), "not_configured") {
		t.Fatalf("missing-key output: %d %s", w.Code, w.Body)
	}
	t.Setenv("CARVARIABLES_API_KEY", "cv_dummy")
	for _, uri := range []string{"/api/velocity/search?q=", "/api/velocity/vehicles?modelYear=1800", "/api/velocity/vehicles?fuel=solar", "/api/velocity/vehicles?key=secret", "/api/velocity/search?q=BMW&variants=9"} {
		w := httptest.NewRecorder()
		g.handler(strings.HasPrefix(uri, "/api/velocity/search"))(w, httptest.NewRequest("GET", uri, nil))
		if w.Code != 400 {
			t.Errorf("%s => %d expected 400", uri, w.Code)
		}
	}
}

func TestCarVariablesUpstreamLimitIsFriendly(t *testing.T) {
	t.Setenv("CARVARIABLES_API_KEY", "cv_dummy")
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(429)
		_, _ = w.Write([]byte(`{"error":"account private info"}`))
	}))
	defer upstream.Close()
	g := newCarVariablesGateway(upstream.Client(), upstream.URL)
	w := httptest.NewRecorder()
	g.handler(true)(w, httptest.NewRequest("GET", "/api/velocity/search?q=BMW", nil))
	if w.Code != 429 || !strings.Contains(w.Body.String(), "quota_exceeded") || strings.Contains(w.Body.String(), "private info") {
		t.Fatalf("quota error unsafe: %d %s", w.Code, w.Body)
	}
}
