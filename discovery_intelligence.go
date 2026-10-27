package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Discovery intelligence is independent of the existing listings, compare and
// model-name discovery endpoints. A model name ALONE does not reveal a trim's
// fuel system or drivetrain; full specifications come from a specific VIN.
type discoveryGateway struct {
	client     *http.Client
	vinBase    string
	safetyBase string
	mu         sync.Mutex
	cache      map[string]discoveryCache
}
type discoveryCache struct {
	body    []byte
	expires time.Time
}

func newDiscoveryGateway(client *http.Client, vinBase, safetyBase string) *discoveryGateway {
	if client == nil {
		client = &http.Client{Timeout: 11 * time.Second}
	}
	return &discoveryGateway{client: client, vinBase: strings.TrimRight(vinBase, "/"), safetyBase: strings.TrimRight(safetyBase, "/"), cache: make(map[string]discoveryCache)}
}

var discovery = newDiscoveryGateway(nil, "https://vpic.nhtsa.dot.gov/api", "https://api.nhtsa.gov")
var discoveryLabel = regexp.MustCompile(`^[\pL\pN][\pL\pN &'().-]{0,69}$`)

func discoveryValidateLabel(s string) bool {
	return len(s) >= 1 && len(s) <= 70 && discoveryLabel.MatchString(s)
}
func discoveryValidateYear(s string) (int, error) {
	y, err := strconv.Atoi(s)
	if err != nil || y < 1981 || y > time.Now().Year()+2 {
		return 0, errors.New("Enter a valid vehicle year")
	}
	return y, nil
}
func (g *discoveryGateway) request(ctx context.Context, endpoint string, ttl time.Duration) ([]byte, error) {
	g.mu.Lock()
	if cached, ok := g.cache[endpoint]; ok && time.Now().Before(cached.expires) {
		body := append([]byte(nil), cached.body...)
		g.mu.Unlock()
		return body, nil
	}
	g.mu.Unlock()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	response, err := g.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("vehicle intelligence service unavailable (%d)", response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, 4<<20+1))
	if err != nil {
		return nil, err
	}
	if len(body) > 4<<20 || !json.Valid(body) {
		return nil, errors.New("vehicle intelligence response is invalid")
	}
	if ttl > 0 {
		g.mu.Lock()
		if len(g.cache) >= 128 {
			g.cache = make(map[string]discoveryCache)
		}
		g.cache[endpoint] = discoveryCache{append([]byte(nil), body...), time.Now().Add(ttl)}
		g.mu.Unlock()
	}
	return body, nil
}
func discoveryEndpointError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
func (g *discoveryGateway) vinHandler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	vin := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("vin")))
	if !vinPattern.MatchString(vin) {
		discoveryEndpointError(w, 400, "Enter a valid 17-character VIN (excluding I, O and Q)")
		return
	}
	endpoint := g.vinBase + "/vehicles/DecodeVinValuesExtended/" + url.PathEscape(vin) + "?format=json"
	raw, err := g.request(r.Context(), endpoint, 15*time.Minute)
	if err != nil {
		discoveryEndpointError(w, 502, "Vehicle details are temporarily unavailable")
		return
	}
	var upstream struct {
		Results []map[string]any `json:"Results"`
	}
	if json.Unmarshal(raw, &upstream) != nil || len(upstream.Results) == 0 {
		discoveryEndpointError(w, 502, "Unable to read decoded vehicle information")
		return
	}
	first := upstream.Results[0]
	fields := map[string]string{
		"vin": vin, "make": "Make", "model": "Model", "year": "ModelYear", "manufacturer": "Manufacturer", "trim": "Trim", "series": "Series", "body": "BodyClass", "fuel": "FuelTypePrimary", "fuelSecondary": "FuelTypeSecondary", "transmission": "TransmissionStyle", "drivetrain": "DriveType", "engine": "DisplacementL", "cylinders": "EngineCylinders", "horsepower": "EngineHP", "doors": "Doors", "plantCountry": "PlantCountry", "vehicleType": "VehicleType", "errorCode": "ErrorCode", "errorText": "ErrorText",
	}
	result := map[string]string{}
	for key, source := range fields {
		if value, ok := first[source]; ok && value != nil {
			result[key] = strings.TrimSpace(fmt.Sprint(value))
		}
	}
	if result["errorCode"] != "" && result["errorCode"] != "0" {
		discoveryEndpointError(w, 422, "This VIN could not be fully decoded; verify the characters and try again")
		return
	}
	if result["make"] == "" && result["model"] == "" {
		discoveryEndpointError(w, 404, "No vehicle record was found for that VIN")
		return
	}
	// No full VIN lookups in batches or background: this endpoint is for one user request.
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(result)
}
func (g *discoveryGateway) recallsHandler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	makeName := strings.TrimSpace(r.URL.Query().Get("make"))
	model := strings.TrimSpace(r.URL.Query().Get("model"))
	year, err := discoveryValidateYear(r.URL.Query().Get("year"))
	if !discoveryValidateLabel(makeName) || !discoveryValidateLabel(model) || err != nil {
		discoveryEndpointError(w, 400, "Provide a valid manufacturer, model and year")
		return
	}
	q := url.Values{"make": {makeName}, "model": {model}, "modelYear": {strconv.Itoa(year)}}
	endpoint := g.safetyBase + "/recalls/recallsByVehicle?" + q.Encode()
	data, err := g.request(r.Context(), endpoint, 30*time.Minute)
	if err != nil {
		discoveryEndpointError(w, 502, "Recall information is temporarily unavailable")
		return
	}
	var upstream struct {
		Count   int               `json:"Count"`
		Results []json.RawMessage `json:"results"`
	}
	if json.Unmarshal(data, &upstream) != nil {
		discoveryEndpointError(w, 502, "Recall information is temporarily unavailable")
		return
	}
	// The official recalls endpoint uses lowercase 'results'; proxy it without false claims.
	w.Header().Set("Cache-Control", "public, max-age=600")
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(data)
}
func (g *discoveryGateway) safetyHandler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	makeName := strings.TrimSpace(r.URL.Query().Get("make"))
	model := strings.TrimSpace(r.URL.Query().Get("model"))
	year, err := discoveryValidateYear(r.URL.Query().Get("year"))
	if !discoveryValidateLabel(makeName) || !discoveryValidateLabel(model) || err != nil {
		discoveryEndpointError(w, 400, "Provide a valid manufacturer, model and year")
		return
	}
	endpoint := fmt.Sprintf("%s/SafetyRatings/modelyear/%d/make/%s/model/%s", g.safetyBase, year, url.PathEscape(makeName), url.PathEscape(model))
	data, err := g.request(r.Context(), endpoint, 30*time.Minute)
	if err != nil {
		discoveryEndpointError(w, 502, "Safety rating information is temporarily unavailable")
		return
	}
	var upstream struct {
		Results []json.RawMessage `json:"Results"`
	}
	if json.Unmarshal(data, &upstream) != nil {
		discoveryEndpointError(w, 502, "Safety rating information is temporarily unavailable")
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=600")
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(data)
}
func (g *discoveryGateway) ratingHandler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	id := r.URL.Query().Get("id")
	numeric, err := strconv.Atoi(id)
	if err != nil || numeric <= 0 || numeric > 100000000 {
		discoveryEndpointError(w, 400, "Invalid vehicle rating reference")
		return
	}
	endpoint := fmt.Sprintf("%s/SafetyRatings/VehicleId/%d", g.safetyBase, numeric)
	data, err := g.request(r.Context(), endpoint, 30*time.Minute)
	if err != nil {
		discoveryEndpointError(w, 502, "Safety ratings are temporarily unavailable")
		return
	}
	var upstream struct {
		Results []json.RawMessage `json:"Results"`
	}
	if json.Unmarshal(data, &upstream) != nil {
		discoveryEndpointError(w, 502, "Safety ratings are temporarily unavailable")
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=600")
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(data)
}
