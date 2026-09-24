package api

import (
	"encoding/json"
	"fmt"
	"net/http"
)

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

	url := fmt.Sprintf(
		"https://api.vehicles.dev/v1/vehicles/vin/%s",
		vin,
	)

	req, err := http.NewRequest("GET", url, nil)

	if err != nil {
		return Vehicle{}, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}

	resp, err := client.Do(req)

	if err != nil {
		return Vehicle{}, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return Vehicle{}, fmt.Errorf(
			"API returned status: %s",
			resp.Status,
		)
	}

	var data VehicleResponse

	err = json.NewDecoder(resp.Body).Decode(&data)

	if err != nil {
		return Vehicle{}, err
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

	url := fmt.Sprintf(
		"https://api.vehicles.dev/v1/vehicles/specifications/%s",
		vin,
	)

	req, err := http.NewRequest("GET", url, nil)

	if err != nil {
		return VehicleSpecifications{}, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}

	resp, err := client.Do(req)

	if err != nil {
		return VehicleSpecifications{}, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return VehicleSpecifications{}, fmt.Errorf(
			"API returned status: %s",
			resp.Status,
		)
	}

	var data SpecificationsResponse

	err = json.NewDecoder(resp.Body).Decode(&data)

	if err != nil {
		return VehicleSpecifications{}, err
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
	Total   int       `json:"total"`
	Results []Listing `json:"results"`
}

func SearchVehicles(apiKey string, limit int) ([]Listing, error) {

	url := fmt.Sprintf(
		"https://api.vehicles.dev/v1/vehicles/listings?limit=%d",
		limit,
	)

	req, err := http.NewRequest("GET", url, nil)

	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}

	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf(
			"API returned status: %s",
			resp.Status,
		)
	}

	var data ListingsResponse

	err = json.NewDecoder(resp.Body).Decode(&data)

	if err != nil {
		return nil, err
	}

	return data.Results, nil
}
