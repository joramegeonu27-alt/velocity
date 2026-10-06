package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const requestTimeout = 10 * time.Second

var client = &http.Client{
	Timeout: requestTimeout,
}

func doJSON(ctx context.Context, method, url, apiKey string, target any) error {
	req, err := http.NewRequestWithContext(ctx, method, url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		if len(body) > 0 {
			return fmt.Errorf("%s: %s: %s", method, resp.Status, string(body))
		}
		return fmt.Errorf("%s: %s", method, resp.Status)
	}

	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		return fmt.Errorf("decode %s response: %w", method, err)
	}

	return nil
}

type Vehicle struct {
	Year         int    `json:"year"`
	Make         string `json:"make"`
	Model        string `json:"model"`
	Trim         string `json:"trim"`
	BodyStyle    string `json:"body_style"`
	Fuel         string `json:"fuel"`
	Transmission string `json:"transmission"`
	Cylinders    int    `json:"cylinders"`
	Doors        int    `json:"doors"`
	Engine       string `json:"engine"`
}

type VehicleResponse struct {
	Vehicle Vehicle `json:"vehicle"`
	VIN     string  `json:"vin"`
}

func GetVehicle(vin string, apiKey string) (Vehicle, error) {
	url := fmt.Sprintf("https://api.vehicles.dev/v1/vehicles/vin/%s", vin)

	var data VehicleResponse
	err := doJSON(context.Background(), http.MethodGet, url, apiKey, &data)
	if err != nil {
		return Vehicle{}, fmt.Errorf("vehicle lookup failed: %w", err)
	}

	return data.Vehicle, nil
}

type VehicleSpecifications struct {
	Make               string `json:"make"`
	Model              string `json:"model"`
	Year               string `json:"year"`
	Trim               string `json:"trim"`
	Series             string `json:"series"`
	BodyClass          string `json:"body_class"`
	Doors              string `json:"doors"`
	Seats              string `json:"seats"`
	DriveType          string `json:"drive_type"`
	Cylinders          string `json:"cylinders"`
	DisplacementL      string `json:"displacement_l"`
	EngineHP           string `json:"engine_hp"`
	FuelPrimary        string `json:"fuel_primary"`
	EngineConfig       string `json:"engine_config"`
	TransmissionStyle  string `json:"transmission_style"`
	TransmissionSpeeds string `json:"transmission_speeds"`
	GVWR               string `json:"gvwr"`
	PlantCountry       string `json:"plant_country"`
	Manufacturer       string `json:"manufacturer"`
	VehicleType        string `json:"vehicle_type"`
}

type SpecificationsResponse struct {
	Source         string                `json:"source"`
	Specifications VehicleSpecifications `json:"specifications"`
	VIN            string                `json:"vin"`
}

func GetSpecifications(vin string, apiKey string) (VehicleSpecifications, error) {
	url := fmt.Sprintf("https://api.vehicles.dev/v1/vehicles/specifications/%s", vin)

	var data SpecificationsResponse
	err := doJSON(context.Background(), http.MethodGet, url, apiKey, &data)
	if err != nil {
		return VehicleSpecifications{}, fmt.Errorf("specifications lookup failed: %w", err)
	}

	return data.Specifications, nil
}

type Listing struct {
	VIN          string `json:"vin"`
	Year         int    `json:"year"`
	Make         string `json:"make"`
	Model        string `json:"model"`
	Trim         string `json:"trim"`
	BodyStyle    string `json:"body_style"`
	Fuel         string `json:"fuel"`
	Drivetrain   string `json:"drivetrain"`
	Transmission string `json:"transmission"`
	Color        string `json:"color"`
	Price        int    `json:"price"`
	Miles        int    `json:"miles"`
	Condition    string `json:"condition"`
	DealerName   string `json:"dealer_name"`
	Image        string `json:"primaryImage"`
}

type ListingsResponse struct {
	Count   int       `json:"count"`
	Limit   int       `json:"limit"`
	Offset  int       `json:"offset"`
	Total   int       `json:"total"`
	Results []Listing `json:"results"`
}

func SearchVehicles(apiKey string, limit int, offset int) (ListingsResponse, error) {
	if limit < 1 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}
	if offset < 0 {
		offset = 0
	}

	url := fmt.Sprintf(
		"https://api.vehicles.dev/v1/vehicles/listings?limit=%d&offset=%d",
		limit,
		offset,
	)

	var data ListingsResponse
	err := doJSON(context.Background(), http.MethodGet, url, apiKey, &data)
	if err != nil {
		return ListingsResponse{}, fmt.Errorf("listings lookup failed: %w", err)
	}

	return data, nil
}

type VehiclePhotos struct {
	GalleryComplete bool     `json:"galleryComplete"`
	GalleryCount    int      `json:"galleryCount"`
	ListingSource   string   `json:"listingSource"`
	ListingURL      string   `json:"listingUrl"`
	PhotoCount      int      `json:"photoCount"`
	Photos          []string `json:"photos"`
	PrimaryImage    string   `json:"primaryImage"`
	Source          string   `json:"source"`
	VIN             string   `json:"vin"`
}

func GetVehiclePhotos(vin string, apiKey string) (VehiclePhotos, error) {
	url := fmt.Sprintf("https://api.vehicles.dev/v1/vehicles/photos/%s", vin)

	var data VehiclePhotos
	err := doJSON(context.Background(), http.MethodGet, url, apiKey, &data)
	if err != nil {
		return VehiclePhotos{}, fmt.Errorf("photo lookup failed: %w", err)
	}

	return data, nil
}
