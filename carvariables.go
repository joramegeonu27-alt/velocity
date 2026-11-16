package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// carVariablesGateway keeps API credentials server-side and is deliberately
// separate from VÉLOCITY's NHTSA and curated-collection integrations.
// All upstream URLs are built from a fixed, trusted base and validated fields.
type carVariablesGateway struct {
	client  *http.Client
	base    string
	mu      sync.Mutex
	cache   map[string]carVariablesCacheEntry
	flights map[string]*carVariablesFlight
	pace    sync.Mutex
	next    time.Time
}

type carVariablesCacheEntry struct {
	data    []byte
	expires time.Time
}
type carVariablesFlight struct {
	done   chan struct{}
	data   []byte
	status int
	err    error
}

func newCarVariablesGateway(client *http.Client, base string) *carVariablesGateway {
	if client == nil {
		client = &http.Client{Timeout: 12 * time.Second}
	}
	return &carVariablesGateway{client: client, base: strings.TrimRight(base, "/"), cache: make(map[string]carVariablesCacheEntry), flights: make(map[string]*carVariablesFlight)}
}

var carVariables = newCarVariablesGateway(nil, "https://api.carvariables.com")

func carVariablesParam(q url.Values, name string, limit int) (string, error) {
	value := strings.TrimSpace(q.Get(name))
	if len([]rune(value)) > limit {
		return "", fmt.Errorf("%s is too long", name)
	}
	return value, nil
}
func carVariablesAllowed(value string, choices ...string) bool {
	if value == "" {
		return true
	}
	for _, candidate := range choices {
		if value == candidate {
			return true
		}
	}
	return false
}
func carVariablesNumber(v, name string, min, max int) error {
	if v == "" {
		return nil
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < min || n > max {
		return fmt.Errorf("%s is invalid", name)
	}
	return nil
}

func carVariablesQuery(r *http.Request, search bool) (url.Values, error) {
	src := r.URL.Query()
	dst := make(url.Values)
	fields := []struct {
		name  string
		limit int
	}{
		{"q", 200}, {"make", 120}, {"modelFamily", 160}, {"modelYear", 4}, {"body", 24}, {"fuel", 20}, {"drive", 10},
		{"sort", 20}, {"page", 5}, {"per", 2}, {"variants", 1},
	}
	if search {
		fields = fields[:1+0]
		fields = append(fields, struct {
			name  string
			limit int
		}{"page", 5}, struct {
			name  string
			limit int
		}{"per", 2}, struct {
			name  string
			limit int
		}{"variants", 1})
	}
	for _, field := range fields {
		val, err := carVariablesParam(src, field.name, field.limit)
		if err != nil {
			return nil, err
		}
		if val != "" {
			dst.Set(field.name, val)
		}
	}
	if search && dst.Get("q") == "" {
		return nil, errors.New("Enter a vehicle make, model or search phrase")
	}
	if err := carVariablesNumber(dst.Get("modelYear"), "Model year", 1886, 2100); err != nil {
		return nil, err
	}
	if err := carVariablesNumber(dst.Get("page"), "Page", 1, 1000); err != nil {
		return nil, err
	}
	if err := carVariablesNumber(dst.Get("per"), "Page size", 1, 50); err != nil {
		return nil, err
	}
	if !carVariablesAllowed(dst.Get("variants"), "1") {
		return nil, errors.New("Invalid variants option")
	}
	if !carVariablesAllowed(dst.Get("body"), "coupe", "sedan", "hatchback", "wagon", "gt", "suv", "mpv", "pickup", "van", "convertible") {
		return nil, errors.New("Invalid body type")
	}
	if !carVariablesAllowed(dst.Get("fuel"), "petrol", "diesel", "hybrid", "electric", "other") {
		return nil, errors.New("Invalid fuel type")
	}
	if !carVariablesAllowed(dst.Get("drive"), "fwd", "rwd", "awd") {
		return nil, errors.New("Invalid drivetrain")
	}
	if !carVariablesAllowed(dst.Get("sort"), "relevance", "newest", "oldest", "name") {
		return nil, errors.New("Invalid sort order")
	}
	if len(src) > 0 {
		for k := range src {
			if _, ok := dst[k]; !ok && k != "variants" && k != "page" && k != "per" && k != "modelYear" && k != "body" && k != "fuel" && k != "drive" && k != "sort" && k != "q" && k != "make" && k != "modelFamily" {
				return nil, errors.New("Unsupported search parameter")
			}
		}
	}
	return dst, nil
}

func (g *carVariablesGateway) throttle(ctx context.Context) error {
	g.pace.Lock()
	// Reserve an upstream request slot. This caps traffic to one request/sec.
	now := time.Now()
	start := now
	if g.next.After(start) {
		start = g.next
	}
	g.next = start.Add(time.Second)
	g.pace.Unlock()
	if wait := time.Until(start); wait > 0 {
		timer := time.NewTimer(wait)
		defer timer.Stop()
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timer.C:
		}
	}
	return nil
}

func (g *carVariablesGateway) fetch(ctx context.Context, endpoint string, key string) ([]byte, int, error) {
	g.mu.Lock()
	if c, found := g.cache[endpoint]; found && time.Now().Before(c.expires) {
		data := append([]byte(nil), c.data...)
		g.mu.Unlock()
		return data, 200, nil
	}
	if f, found := g.flights[endpoint]; found {
		g.mu.Unlock()
		select {
		case <-ctx.Done():
			return nil, 0, ctx.Err()
		case <-f.done:
			return append([]byte(nil), f.data...), f.status, f.err
		}
	}
	f := &carVariablesFlight{done: make(chan struct{})}
	g.flights[endpoint] = f
	g.mu.Unlock()

	data, status, err := g.fetchUpstream(ctx, endpoint, key)
	g.mu.Lock()
	if err == nil && status == 200 {
		// Keep a bounded cache; entries are only reused for the lifetime of this server.
		if len(g.cache) >= 256 {
			g.cache = make(map[string]carVariablesCacheEntry)
		}
		g.cache[endpoint] = carVariablesCacheEntry{data: append([]byte(nil), data...), expires: time.Now().Add(12 * time.Hour)}
	}
	f.data, f.status, f.err = data, status, err
	delete(g.flights, endpoint)
	close(f.done)
	g.mu.Unlock()
	return data, status, err
}

func (g *carVariablesGateway) fetchUpstream(ctx context.Context, endpoint, key string) ([]byte, int, error) {
	if err := g.throttle(ctx); err != nil {
		return nil, 0, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-API-Key", key)
	req.Header.Set("Accept", "application/json")
	resp, err := g.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20+1))
	if err != nil {
		return nil, resp.StatusCode, err
	}
	if len(raw) > 4<<20 {
		return nil, resp.StatusCode, errors.New("Vehicle service response was too large")
	}
	if resp.StatusCode != 200 {
		return nil, resp.StatusCode, nil
	}
	var upstream struct {
		Success bool            `json:"success"`
		Data    json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(raw, &upstream); err != nil || !upstream.Success || len(upstream.Data) == 0 {
		return nil, 502, errors.New("Vehicle service returned an invalid response")
	}
	// Do not forward the upstream 'api' metadata (which contains provider URLs
	// and authentication instructions) to public website visitors.
	wrapped, err := json.Marshal(map[string]any{"success": true, "data": upstream.Data})
	return wrapped, 200, err
}

func (g *carVariablesGateway) handler(search bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "private, no-store")
		if !allowGet(w, r) {
			return
		}
		key := strings.TrimSpace(os.Getenv("CARVARIABLES_API_KEY"))
		if key == "" {
			carVariablesError(w, 503, "not_configured", "Vehicle specifications are not configured on this server")
			return
		}
		params, err := carVariablesQuery(r, search)
		if err != nil {
			carVariablesError(w, 400, "invalid_parameter", err.Error())
			return
		}
		endpointPath := "/v1/cars"
		if search {
			endpointPath = "/v1/search"
		}
		endpoint := g.base + endpointPath + "?" + params.Encode()
		data, status, err := g.fetch(r.Context(), endpoint, key)
		if err != nil {
			carVariablesError(w, 502, "upstream_unavailable", "Detailed vehicle specifications are temporarily unavailable")
			return
		}
		switch status {
		case 200:
			_, _ = w.Write(data)
		case 400:
			carVariablesError(w, 400, "invalid_parameter", "Please review the selected vehicle filters")
		case 401, 403:
			carVariablesError(w, 502, "authentication_failed", "Vehicle specification service authentication needs attention")
		case 404:
			carVariablesError(w, 404, "no_results", "No matching vehicle specifications were found")
		case 429:
			carVariablesError(w, 429, "quota_exceeded", "The vehicle specification search allowance is temporarily exhausted")
		default:
			carVariablesError(w, 502, "upstream_unavailable", "Detailed vehicle specifications are temporarily unavailable")
		}
	}
}
func carVariablesError(w http.ResponseWriter, status int, code, message string) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "code": code, "error": message})
}
