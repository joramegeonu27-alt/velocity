package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDoJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer demo" {
			t.Error("missing API authorization")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"results":[],"total":0}`))
	}))
	defer server.Close()
	var result ListingsResponse
	if err := doJSON(context.Background(), http.MethodGet, server.URL, "demo", &result); err != nil {
		t.Fatal(err)
	}
}

func TestDoJSONRejectsErrorStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(503); w.Write([]byte("offline")) }))
	defer server.Close()
	if err := doJSON(context.Background(), http.MethodGet, server.URL, "x", &ListingsResponse{}); err == nil || !strings.Contains(err.Error(), "503") {
		t.Fatalf("expected upstream error, got %v", err)
	}
}

func TestDoJSONContextCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := doJSON(ctx, http.MethodGet, "https://example.invalid", "x", &ListingsResponse{}); err == nil {
		t.Fatal("expected canceled request")
	}
}
