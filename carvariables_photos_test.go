package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

const samplePhotoName = "car_fb2e7fe275aa7cf62f1600660fa421e072870b18d8fd4f23.avif"

func TestCVPhotoProxyDownloadsAndCaches(t *testing.T) {
	t.Setenv("CARVARIABLES_API_KEY", "test-secret")
	var upstreamRequests atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamRequests.Add(1)
		if r.URL.Path != "/images/"+samplePhotoName {
			t.Errorf("unexpected path %q", r.URL.Path)
		}
		if r.Header.Get("X-API-Key") != "" {
			t.Error("API credential must not be forwarded to image host")
		}
		w.Header().Set("Content-Type", "image/avif")
		_, _ = w.Write([]byte("fake-avif-bytes"))
	}))
	defer upstream.Close()

	proxy := newCVPhotoProxy(upstream.URL, upstream.Client())
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest("GET", "/api/velocity/photo?file="+samplePhotoName, nil)
		result := httptest.NewRecorder()
		proxy.handler(result, req)
		if result.Code != 200 {
			t.Fatalf("response %d: %s", result.Code, result.Body.String())
		}
		if result.Header().Get("Content-Type") != "image/avif" {
			t.Fatal("missing AVIF MIME type")
		}
		if !bytes.Equal(result.Body.Bytes(), []byte("fake-avif-bytes")) {
			t.Fatal("bad body")
		}
		if strings.Contains(result.Body.String(), "test-secret") {
			t.Fatal("leaked key")
		}
	}
	if upstreamRequests.Load() != 1 {
		t.Fatalf("expected one image download, got %d", upstreamRequests.Load())
	}
}

func TestCVPhotoProxyRejectsArbitraryURLs(t *testing.T) {
	t.Setenv("CARVARIABLES_API_KEY", "test-secret")
	proxy := newCVPhotoProxy("https://carvariables.com", nil)
	for _, v := range []string{"https://example.com/private", "../private.png", "car_xyz.avif", "car_1234567890.avif", samplePhotoName + "/../secrets"} {
		req := httptest.NewRequest("GET", "/api/velocity/photo?file="+v, nil)
		result := httptest.NewRecorder()
		proxy.handler(result, req)
		if result.Code != 400 {
			t.Errorf("%q: expected 400, got %d", v, result.Code)
		}
	}
}

func TestCVPhotoProxyNoKey(t *testing.T) {
	t.Setenv("CARVARIABLES_API_KEY", "")
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-API-Key"); got != "" {
			t.Errorf("image request leaked key: %q", got)
		}
		w.Header().Set("Content-Type", "image/avif")
		_, _ = w.Write([]byte("fake-avif-bytes"))
	}))
	defer upstream.Close()
	proxy := newCVPhotoProxy(upstream.URL, upstream.Client())
	req := httptest.NewRequest("GET", "/api/velocity/photo?file="+samplePhotoName, nil)
	result := httptest.NewRecorder()
	proxy.handler(result, req)
	if result.Code != 200 {
		t.Errorf("expected public image endpoint to work without API key; got %d", result.Code)
	}
}

func TestCVPhotoRedirectPolicy(t *testing.T) {
	proxy := newCVPhotoProxy("https://cdn.carvariables.com", nil)
	cases := []struct {
		url     string
		allowed bool
	}{
		{"https://cdn.carvariables.com/images/" + samplePhotoName, true},
		{"https://carvariables.com/images/" + samplePhotoName, true},
		{"https://example.com/images/" + samplePhotoName, false},
		{"http://cdn.carvariables.com/images/" + samplePhotoName, false},
		{"https://cdn.carvariables.com/private", false},
	}
	for _, tc := range cases {
		req := httptest.NewRequest("GET", tc.url, nil)
		err := proxy.client.CheckRedirect(req, []*http.Request{httptest.NewRequest("GET", "https://carvariables.com/images/"+samplePhotoName, nil)})
		if (err == nil) != tc.allowed {
			t.Errorf("redirect %s allowed=%v err=%v", tc.url, tc.allowed, err)
		}
	}
}

func TestCVPhotoProxyUnavailableImage(t *testing.T) {
	t.Setenv("CARVARIABLES_API_KEY", "test-secret")
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.NotFound(w, r) }))
	defer upstream.Close()
	proxy := newCVPhotoProxy(upstream.URL, upstream.Client())
	req := httptest.NewRequest("GET", "/api/velocity/photo?file="+samplePhotoName, nil)
	result := httptest.NewRecorder()
	proxy.handler(result, req)
	if result.Code != 404 {
		t.Errorf("expected 404, got %d", result.Code)
	}
}
