package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// NHTSA vehicle discovery is independent of the showroom/listings API.
type nhtsaResult struct {
	MakeID    int    `json:"Make_ID"`
	MakeName  string `json:"Make_Name"`
	ModelID   int    `json:"Model_ID"`
	ModelName string `json:"Model_Name"`
}

type nhtsaResponse struct {
	Count   int           `json:"Count"`
	Results []nhtsaResult `json:"Results"`
}

type cacheEntry struct {
	body    []byte
	expires time.Time
}

type nhtsaService struct {
	client  *http.Client
	baseURL string
	mu      sync.Mutex
	cache   map[string]cacheEntry
}

func newNHTSAService(baseURL string, client *http.Client) *nhtsaService {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	return &nhtsaService{client: client, baseURL: strings.TrimRight(baseURL, "/"), cache: make(map[string]cacheEntry)}
}

var nhtsa = newNHTSAService("https://vpic.nhtsa.dot.gov/api", nil)

func (s *nhtsaService) fetch(ctx context.Context, endpoint string) ([]byte, error) {
	s.mu.Lock()
	entry, cached := s.cache[endpoint]
	if cached && time.Now().Before(entry.expires) {
		body := entry.body
		s.mu.Unlock()
		return body, nil
	}
	s.mu.Unlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("NHTSA returned HTTP %d", res.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, 8<<20+1))
	if err != nil {
		return nil, err
	}
	if len(data) > 8<<20 {
		return nil, fmt.Errorf("NHTSA response too large")
	}
	var parsed nhtsaResponse
	if err := json.Unmarshal(data, &parsed); err != nil {
		return nil, fmt.Errorf("invalid NHTSA response: %w", err)
	}
	if parsed.Results == nil {
		return nil, fmt.Errorf("NHTSA response missing results")
	}
	s.mu.Lock()
	s.cache[endpoint] = cacheEntry{body: data, expires: time.Now().Add(24 * time.Hour)}
	s.mu.Unlock()
	return data, nil
}

func nhtsaWriteError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func (s *nhtsaService) makesHandler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	body, err := s.fetch(r.Context(), "/vehicles/GetMakesForVehicleType/car?format=json")
	if err != nil {
		nhtsaWriteError(w, http.StatusBadGateway, "Vehicle manufacturer service temporarily unavailable")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write(body)
}

func (s *nhtsaService) modelsHandler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	makeName := strings.TrimSpace(r.URL.Query().Get("make"))
	if len(makeName) < 2 || len(makeName) > 60 {
		nhtsaWriteError(w, http.StatusBadRequest, "make must contain 2 to 60 characters")
		return
	}
	for _, char := range makeName {
		if !((char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == ' ' || char == '-' || char == '&' || char == '.') {
			nhtsaWriteError(w, http.StatusBadRequest, "make contains unsupported characters")
			return
		}
	}
	yearText := strings.TrimSpace(r.URL.Query().Get("year"))
	endpoint := "/vehicles/GetModelsForMake/" + url.PathEscape(makeName) + "?format=json"
	if yearText != "" {
		year, err := strconv.Atoi(yearText)
		if err != nil || year < 1996 || year > time.Now().Year()+2 {
			nhtsaWriteError(w, http.StatusBadRequest, "year must be between 1996 and two years from now")
			return
		}
		endpoint = "/vehicles/GetModelsForMakeYear/make/" + url.PathEscape(makeName) + "/modelyear/" + strconv.Itoa(year) + "?format=json"
	}
	body, err := s.fetch(r.Context(), endpoint)
	if err != nil {
		nhtsaWriteError(w, http.StatusBadGateway, "Vehicle model service temporarily unavailable")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write(body)
}

var discoverPage = template.Must(template.New("discover").Parse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vehicle Discovery — VÉLOCITY</title><link rel="stylesheet" href="/static/css/style.css">
<style>body{background:#0b0e10;color:#f3f3f3;font-family:Arial,sans-serif}main{max-width:960px;margin:5rem auto;padding:2rem}a{color:#e2d0ac}h1{font-size:clamp(2rem,5vw,4rem)}.controls{display:flex;gap:1rem;flex-wrap:wrap;margin:2rem 0}label{display:grid;gap:.5rem}select,input,button{padding:.8rem 1rem;font:inherit;border-radius:.4rem;border:1px solid #555}button{cursor:pointer;background:#d8be89;color:#181818}#results{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;list-style:none;padding:0}#results li{border:1px solid #444;border-radius:8px;padding:1rem;background:#191d21}.muted{color:#bbb}</style>
</head><body><main><a href="/cars">← Back to collection</a><p class="muted">NHTSA / VEHICLE RESEARCH</p><h1>Discover vehicle models.</h1><p>Explore manufacturer-reported make and model names. Results are reference data, not vehicles for sale.</p>
<form id="lookup" class="controls"><label>Manufacturer<select id="make" required><option value="">Loading makes…</option></select></label>
<label>Model year (optional)<input id="year" inputmode="numeric" type="number" min="1996" max="{{.MaxYear}}" placeholder="e.g. 2024"></label><button type="submit">Find models</button></form>
<p id="status" role="status" aria-live="polite">Loading manufacturers…</p><ul id="results"></ul><p class="muted">Source: <a href="https://vpic.nhtsa.dot.gov/api/" rel="noopener noreferrer">NHTSA vPIC</a>. No prices, photos or verified performance specifications are provided here.</p></main>
<script>
const makeSelect=document.getElementById('make'), yearInput=document.getElementById('year'), statusText=document.getElementById('status'), results=document.getElementById('results');
async function loadJSON(path){const response=await fetch(path);const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;}
(async()=>{try{const data=await loadJSON('/api/nhtsa/makes');makeSelect.replaceChildren(new Option('Select manufacturer',''));const seen=new Set();for(const row of (data.Results||[]).sort((a,b)=>a.MakeName.localeCompare(b.MakeName))){if(seen.has(row.MakeName))continue;seen.add(row.MakeName);makeSelect.add(new Option(row.MakeName,row.MakeName));}statusText.textContent='Choose a manufacturer to explore models.';}catch(e){statusText.textContent=e.message;makeSelect.replaceChildren(new Option('Manufacturers unavailable',''));}})();
document.getElementById('lookup').addEventListener('submit',async e=>{e.preventDefault();results.replaceChildren();if(!makeSelect.value)return;statusText.textContent='Searching…';const params=new URLSearchParams({make:makeSelect.value});if(yearInput.value)params.set('year',yearInput.value);try{const data=await loadJSON('/api/nhtsa/models?'+params);const names=[...new Set((data.Results||[]).map(x=>x.Model_Name).filter(Boolean))].sort();statusText.textContent=names.length+' models found';for(const name of names){const li=document.createElement('li');li.textContent=name;results.append(li);}}catch(err){statusText.textContent=err.message;}});
</script></body></html>`))

func discoverHandler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = discoverPage.Execute(w, struct{ MaxYear int }{time.Now().Year() + 2})
}
