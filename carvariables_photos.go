package main

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

// cvPhotoProxy serves only CarVariables' published car-image filename format.
// It cannot be used to fetch arbitrary URLs or internal network resources.
// Cached images reduce repeat downloads (which may count toward the API plan).
type cvPhotoProxy struct {
	base     string
	client   *http.Client
	mu       sync.Mutex
	cache    map[string]cvPhotoEntry
	inflight map[string]*cvPhotoFlight
}

type cvPhotoEntry struct {
	body    []byte
	mime    string
	expires time.Time
}

type cvPhotoFlight struct {
	done   chan struct{}
	entry  cvPhotoEntry
	status int
}

var cvPhotoName = regexp.MustCompile(`^car_[a-fA-F0-9]{32,80}\.(?:avif|webp|jpe?g|png)$`)

func newCVPhotoProxy(base string, client *http.Client) *cvPhotoProxy {
	if client == nil {
		client = &http.Client{Timeout: 18 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Only the provider's published image CDN is permitted; never follow
			// arbitrary redirects to an untrusted host or internal address.
			if len(via) >= 3 || req.URL.Scheme != "https" ||
				(req.URL.Hostname() != "cdn.carvariables.com" && req.URL.Hostname() != "carvariables.com") ||
				!strings.HasPrefix(req.URL.EscapedPath(), "/images/") {
				return http.ErrUseLastResponse
			}
			return nil
		}}
	}
	return &cvPhotoProxy{base: strings.TrimRight(base, "/"), client: client, cache: make(map[string]cvPhotoEntry), inflight: make(map[string]*cvPhotoFlight)}
}

var carVariablesPhotos = newCVPhotoProxy("https://cdn.carvariables.com", nil)

func cvPhotoMime(filename string) string {
	switch {
	case strings.HasSuffix(filename, ".avif"):
		return "image/avif"
	case strings.HasSuffix(filename, ".webp"):
		return "image/webp"
	case strings.HasSuffix(filename, ".jpg"), strings.HasSuffix(filename, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(filename, ".png"):
		return "image/png"
	default:
		return "application/octet-stream"
	}
}

const cvPhotoMaximumBytes = 8 << 20 // 8 MiB, with a firm read limit.

func (p *cvPhotoProxy) retrieve(ctx context.Context, filename, apiKey string) (cvPhotoEntry, int) {
	p.mu.Lock()
	if cached, ok := p.cache[filename]; ok && time.Now().Before(cached.expires) {
		p.mu.Unlock()
		return cached, http.StatusOK
	}
	if pending, ok := p.inflight[filename]; ok {
		p.mu.Unlock()
		select {
		case <-ctx.Done():
			return cvPhotoEntry{}, http.StatusGatewayTimeout
		case <-pending.done:
			return pending.entry, pending.status
		}
	}
	pending := &cvPhotoFlight{done: make(chan struct{})}
	p.inflight[filename] = pending
	p.mu.Unlock()

	entry, status := p.retrieveUpstream(ctx, filename, apiKey)
	p.mu.Lock()
	if status == http.StatusOK {
		if len(p.cache) >= 48 {
			p.cache = make(map[string]cvPhotoEntry)
		}
		p.cache[filename] = entry
	}
	pending.entry, pending.status = entry, status
	delete(p.inflight, filename)
	close(pending.done)
	p.mu.Unlock()
	return entry, status
}

func (p *cvPhotoProxy) retrieveUpstream(ctx context.Context, filename, apiKey string) (cvPhotoEntry, int) {
	// Share the 1-request/second budget with specification searches.
	if err := carVariables.throttle(ctx); err != nil {
		return cvPhotoEntry{}, http.StatusGatewayTimeout
	}
	endpoint, err := url.Parse(p.base + "/images/" + filename)
	if err != nil || endpoint.Scheme != "https" && endpoint.Scheme != "http" {
		return cvPhotoEntry{}, http.StatusBadGateway
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return cvPhotoEntry{}, http.StatusBadGateway
	}
	req.Header.Set("Accept", "image/avif,image/webp,image/jpeg,image/png")
	// Published image files are requested from the public image CDN.
	// Do not send the API credential to the website host or the CDN:
	// it is only needed for the JSON catalogue API.
	response, err := p.client.Do(req)
	if err != nil {
		return cvPhotoEntry{}, http.StatusBadGateway
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		if response.StatusCode == http.StatusNotFound {
			return cvPhotoEntry{}, http.StatusNotFound
		}
		if response.StatusCode == http.StatusTooManyRequests {
			return cvPhotoEntry{}, http.StatusTooManyRequests
		}
		return cvPhotoEntry{}, http.StatusBadGateway
	}
	if response.ContentLength > cvPhotoMaximumBytes {
		return cvPhotoEntry{}, http.StatusBadGateway
	}
	contentType := strings.ToLower(strings.TrimSpace(strings.Split(response.Header.Get("Content-Type"), ";")[0]))
	if contentType != "" && contentType != "application/octet-stream" && !strings.HasPrefix(contentType, "image/") {
		return cvPhotoEntry{}, http.StatusBadGateway
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, cvPhotoMaximumBytes+1))
	if err != nil || len(data) == 0 || len(data) > cvPhotoMaximumBytes {
		return cvPhotoEntry{}, http.StatusBadGateway
	}
	// The upstream may use application/octet-stream for AVIF; use the vetted suffix.
	return cvPhotoEntry{body: data, mime: cvPhotoMime(filename), expires: time.Now().Add(12 * time.Hour)}, http.StatusOK
}

func (p *cvPhotoProxy) handler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	filename := r.URL.Query().Get("file")
	if !cvPhotoName.MatchString(filename) || len(r.URL.Query()) != 1 {
		http.Error(w, "Invalid vehicle image", http.StatusBadRequest)
		return
	}
	// Image delivery works independently of the JSON search API key.
	entry, status := p.retrieve(r.Context(), filename, "")
	if status != http.StatusOK {
		http.Error(w, "Vehicle photograph unavailable", status)
		return
	}
	w.Header().Set("Content-Type", entry.mime)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write(entry.body)
	}
}
