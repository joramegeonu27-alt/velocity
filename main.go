package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"velocity/api"
)

type Car struct {
	ID          string `json:"id"`
	Brand       string `json:"brand"`
	Model       string `json:"model"`
	Year        int    `json:"year"`
	Horsepower  int    `json:"horsepower"`
	Engine      string `json:"engine"`
	TopSpeed    string `json:"top_speed"`
	ZeroToSixty string `json:"zero_to_sixty"`
	Image       string `json:"image"`

	Photos       []string `json:"photos"`
	PrimaryImage string   `json:"primary_image"`

	Price        int    `json:"price"`
	Miles        int    `json:"miles"`
	Fuel         string `json:"fuel"`
	Drivetrain   string `json:"drivetrain"`
	Transmission string `json:"transmission"`
	Color        string `json:"color"`
	Condition    string `json:"condition"`

	Cylinders    string `json:"cylinders"`
	Displacement string `json:"displacement"`
	Seats        string `json:"seats"`
	Doors        string `json:"doors"`
	BodyClass    string `json:"body_class"`
	EngineConfig string `json:"engine_config"`
	Series       string `json:"series"`
	Manufacturer string `json:"manufacturer"`
}

type CompareData struct {
	Cars     []Car
	CarsJSON template.JS
}

func getAPIKey() string {
	return strings.TrimSpace(os.Getenv("VEHICLES_API_KEY"))
}

func loadAPICars(limit int, offset int) ([]Car, int, error) {
	if limit < 1 { limit = 50 }
	if limit > 500 { limit = 500 }
	if offset < 0 { offset = 0 }

	apiKey := getAPIKey()
	if apiKey == "" {
		return loadLocalPage(limit, offset)
	}

	response, err := api.SearchVehicles(apiKey, limit, offset)
	if err != nil {
		fmt.Println("Vehicles.dev unavailable; using local catalogue:", err)
		return loadLocalPage(limit, offset)
	}

	cars := make([]Car, 0, len(response.Results))
	for _, listing := range response.Results {
		cars = append(cars, Car{
			ID: listing.VIN, Brand: listing.Make, Model: listing.Model, Year: listing.Year,
			Image: listing.Image, Price: listing.Price, Miles: listing.Miles, Fuel: listing.Fuel,
			Drivetrain: listing.Drivetrain, Transmission: listing.Transmission, Color: listing.Color,
			Condition: listing.Condition, Engine: listing.Trim, TopSpeed: "N/A", ZeroToSixty: "N/A",
		})
	}
	return cars, response.Total, nil
}

func loadLocalPage(limit, offset int) ([]Car, int, error) {
	cars, err := loadCars()
	if err != nil { return nil, 0, err }
	total := len(cars)
	if offset >= total { return []Car{}, total, nil }
	end := offset + limit
	if end > total { end = total }
	return cars[offset:end], total, nil
}

func findLocalCar(id string) (*Car, error) {
	cars, err := loadCars()
	if err != nil { return nil, err }
	for i := range cars {
		if cars[i].ID == id {
			car := cars[i]
			return &car, nil
		}
	}
	return nil, nil
}

func renderTemplate(w http.ResponseWriter, templatePath string, data any, errorMessage string) {
	tmpl, err := template.ParseFiles(templatePath)
	if err != nil {
		http.Error(w, errorMessage, http.StatusInternalServerError)
		return
	}

	if err := tmpl.Execute(w, data); err != nil {
		fmt.Println("Template error:", err)
	}
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	renderTemplate(w, "templates/index.html", nil, "Unable to load page")
}

func carsHandler(w http.ResponseWriter, r *http.Request) {

	page := 1

	pageText := r.URL.Query().Get("page")

	if pageText != "" {

		parsedPage, err := strconv.Atoi(pageText)

		if err == nil {
			page = parsedPage
		}
	}

	if page < 1 {
		page = 1
	}

	const carsPerPage = 50

	offset := (page - 1) * carsPerPage

	cars, total, err := loadAPICars(
		carsPerPage,
		offset,
	)

	if err != nil {

		http.Error(
			w,
			"Unable to load cars",
			http.StatusInternalServerError,
		)

		return
	}

	tmpl, err := template.ParseFiles(
		"templates/cars.html",
	)

	if err != nil {

		http.Error(
			w,
			"Unable to load cars page",
			http.StatusInternalServerError,
		)

		return
	}

	data := struct {
		Cars        []Car
		CurrentPage int
		TotalCars   int
		HasNext     bool
		HasPrevious bool
	}{
		Cars:        cars,
		CurrentPage: page,
		TotalCars:   total,
		HasNext:     offset+len(cars) < total,
		HasPrevious: page > 1,
	}

	err = tmpl.Execute(w, data)

	if err != nil {
		fmt.Println("Template error:", err)
	}
}

func enrichCarFromVIN(car *Car, apiKey string) {
	if apiKey == "" || len(car.ID) != 17 {
		return
	}

	specs, err := api.GetSpecifications(car.ID, apiKey)
	if err == nil {
		applySpecifications(car, specs)
	}

	photos, err := api.GetVehiclePhotos(car.ID, apiKey)
	if err == nil {
		car.Photos = photos.Photos
		car.PrimaryImage = photos.PrimaryImage
		if photos.PrimaryImage != "" {
			car.Image = photos.PrimaryImage
		}
	}
}

func applySpecifications(car *Car, specs api.VehicleSpecifications) {
	if horsepower, err := strconv.Atoi(specs.EngineHP); err == nil && horsepower > 0 {
		car.Horsepower = horsepower
	}

	car.Cylinders = specs.Cylinders
	car.Displacement = specs.DisplacementL
	car.Seats = specs.Seats
	car.Doors = specs.Doors
	car.BodyClass = specs.BodyClass
	car.EngineConfig = specs.EngineConfig
	car.Series = specs.Series
	car.Manufacturer = specs.Manufacturer

	if specs.FuelPrimary != "" {
		car.Fuel = specs.FuelPrimary
	}
	if specs.DriveType != "" {
		car.Drivetrain = specs.DriveType
	}
	if specs.TransmissionStyle != "" {
		car.Transmission = specs.TransmissionStyle
		if specs.TransmissionSpeeds != "" {
			car.Transmission += " (" + specs.TransmissionSpeeds + "-speed)"
		}
	}
	if specs.DisplacementL != "" && specs.EngineConfig != "" && specs.Cylinders != "" {
		car.Engine = specs.DisplacementL + "L " + specs.EngineConfig + " " + specs.Cylinders + "cyl"
	}
}

func findCar(id string) (*Car, error) {
	car, err := findLocalCar(id)
	if err != nil {
		return nil, err
	}
	if car != nil {
		return car, nil
	}

	cars, _, err := loadAPICars(50, 0)
	if err != nil {
		return nil, err
	}

	for i := range cars {
		if cars[i].ID == id {
			return &cars[i], nil
		}
	}

	return nil, nil
}

func carDetailHandler(w http.ResponseWriter, r *http.Request) {
	carID := strings.TrimPrefix(r.URL.Path, "/cars/")
	if carID == "" {
		http.NotFound(w, r)
		return
	}

	car, err := findCar(carID)
	if err != nil {
		http.Error(w, "Unable to load car", http.StatusInternalServerError)
		return
	}
	if car == nil {
		http.NotFound(w, r)
		return
	}

	enrichCarFromVIN(car, getAPIKey())
	renderTemplate(w, "templates/car.html", car, "Unable to load car page")
}
func aboutHandler(w http.ResponseWriter, r *http.Request) {
	renderTemplate(w, "templates/about.html", nil, "Unable to load about page")
}

func compareHandler(w http.ResponseWriter, r *http.Request) {

	cars, _, err := loadAPICars(50, 0)

	if err != nil {

		http.Error(
			w,
			"Unable to load cars from API",
			http.StatusInternalServerError,
		)

		return
	}

	carsJSON, err := json.Marshal(cars)

	if err != nil {

		http.Error(
			w,
			"Unable to prepare comparison data",
			http.StatusInternalServerError,
		)

		return
	}

	renderTemplate(
		w,
		"templates/compare.html",
		CompareData{
			Cars:     cars,
			CarsJSON: template.JS(carsJSON),
		},
		"Unable to load compare page",
	)
}

func compareSpecsHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("vin")
	if id == "" {
		http.Error(w, "VIN or car ID is required", http.StatusBadRequest)
		return
	}

	if car, err := findLocalCar(id); err == nil && car != nil {
		response := map[string]string{
			"make": car.Brand, "model": car.Model, "year": strconv.Itoa(car.Year),
			"engine_hp": strconv.Itoa(car.Horsepower), "displacement_l": car.Displacement,
			"engine_config": car.EngineConfig, "cylinders": car.Cylinders,
			"fuel_primary": car.Fuel, "drive_type": car.Drivetrain,
			"transmission_style": car.Transmission, "body_class": car.BodyClass,
			"seats": car.Seats, "doors": car.Doors, "manufacturer": car.Manufacturer,
			"series": car.Series, "vehicle_type": "", "plant_country": "",
			"transmission_speeds": "", "gvwr": "",
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	if len(id) != 17 {
		http.Error(w, "Unknown vehicle", http.StatusNotFound)
		return
	}

	apiKey := getAPIKey()
	if apiKey == "" {
		http.Error(w, "Vehicle API key is not configured", http.StatusServiceUnavailable)
		return
	}

	specs, err := api.GetSpecifications(id, apiKey)
	if err != nil {
		http.Error(w, "Unable to get vehicle specifications", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(specs); err != nil {
		http.Error(w, "Unable to encode specifications", http.StatusInternalServerError)
	}
}

func loadCars() ([]Car, error) {

	data, err := os.ReadFile(
		"data/cars.json",
	)

	if err != nil {
		return nil, err
	}

	var cars []Car

	err = json.Unmarshal(
		data,
		&cars,
	)

	if err != nil {
		return nil, err
	}

	return cars, nil
}

func main() {

	staticFiles := http.FileServer(
		http.Dir("static"),
	)

	http.Handle(
		"/static/",
		http.StripPrefix(
			"/static/",
			staticFiles,
		),
	)

	imgFiles := http.FileServer(
		http.Dir("images"),
	)

	http.Handle(
		"/images/",
		http.StripPrefix(
			"/images/",
			imgFiles,
		),
	)

	http.HandleFunc(
		"/",
		homeHandler,
	)

	http.HandleFunc(
		"/cars",
		carsHandler,
	)

	http.HandleFunc(
		"/cars/",
		carDetailHandler,
	)

	http.HandleFunc(
		"/compare",
		compareHandler,
	)

	http.HandleFunc(
		"/api/compare/specs",
		compareSpecsHandler,
	)

	http.HandleFunc(
		"/about",
		aboutHandler,
	)

	server := &http.Server{
		Addr:              ":8080",
		Handler:           nil,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	fmt.Println("VÉLOCITY server running on http://localhost:8080")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		fmt.Println("Server error:", err)
	}
}
