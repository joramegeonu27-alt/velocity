package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"strconv"
	"strings"

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

const APIkey = "vdev_QnAEDy6TiJmcF6NNCM1tht"

func loadAPICars(limit int, offset int) ([]Car, int, error) {

	var apiKey string
	apiKey = APIkey

	fmt.Println(apiKey)

	response, err := api.SearchVehicles(
		apiKey,
		limit,
		offset,
	)

	if err != nil {
		return nil, 0, err
	}

	var cars []Car

	for _, listing := range response.Results {

		car := Car{
			ID:           listing.VIN,
			Brand:        listing.Make,
			Model:        listing.Model,
			Year:         listing.Year,
			Image:        listing.Image,
			Price:        listing.Price,
			Miles:        listing.Miles,
			Fuel:         listing.Fuel,
			Drivetrain:   listing.Drivetrain,
			Transmission: listing.Transmission,
			Color:        listing.Color,
			Condition:    listing.Condition,
			Engine:       listing.Trim,
			TopSpeed:     "N/A",
			ZeroToSixty:  "N/A",
		}

		cars = append(cars, car)
	}

	return cars, response.Total, nil
}

func homeHandler(w http.ResponseWriter, r *http.Request) {

	tmpl, err := template.ParseFiles(
		"templates/index.html",
	)

	if err != nil {
		http.Error(
			w,
			"Unable to load page",
			http.StatusInternalServerError,
		)
		return
	}

	tmpl.Execute(w, nil)
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

func carDetailHandler(w http.ResponseWriter, r *http.Request) {

	carID := strings.TrimPrefix(
		r.URL.Path,
		"/cars/",
	)

	if carID == "" {
		http.NotFound(w, r)
		return
	}

	apiKey := os.Getenv("VEHICLES_API_KEY")

	if apiKey == "" {
		http.Error(
			w,
			"VEHICLES_API_KEY is not set",
			http.StatusInternalServerError,
		)
		return
	}

	cars, _, err := loadAPICars(50, 0)

	if err != nil {
		http.Error(
			w,
			"Unable to load cars",
			http.StatusInternalServerError,
		)
		return
	}

	var selectedCar *Car

	for i := range cars {

		if cars[i].ID == carID {

			selectedCar = &cars[i]

			break
		}
	}

	if selectedCar == nil {
		http.NotFound(w, r)
		return
	}

	specs, err := api.GetSpecifications(
		selectedCar.ID,
		apiKey,
	)

	if err == nil {

		selectedCar.Horsepower, _ = strconv.Atoi(
			specs.EngineHP,
		)

		selectedCar.Cylinders = specs.Cylinders
		selectedCar.Displacement = specs.DisplacementL
		selectedCar.Seats = specs.Seats
		selectedCar.Doors = specs.Doors
		selectedCar.BodyClass = specs.BodyClass
		selectedCar.EngineConfig = specs.EngineConfig
		selectedCar.Series = specs.Series
		selectedCar.Manufacturer = specs.Manufacturer

		if specs.FuelPrimary != "" {
			selectedCar.Fuel = specs.FuelPrimary
		}

		if specs.DriveType != "" {
			selectedCar.Drivetrain = specs.DriveType
		}

		if specs.TransmissionStyle != "" {

			selectedCar.Transmission =
				specs.TransmissionStyle

			if specs.TransmissionSpeeds != "" {

				selectedCar.Transmission =
					specs.TransmissionStyle +
						" (" +
						specs.TransmissionSpeeds +
						"-speed)"
			}
		}

		if specs.DisplacementL != "" &&
			specs.EngineConfig != "" &&
			specs.Cylinders != "" {

			selectedCar.Engine =
				specs.DisplacementL +
					"L " +
					specs.EngineConfig +
					" " +
					specs.Cylinders +
					"cyl"
		}
	}

	photos, err := api.GetVehiclePhotos(
		selectedCar.ID,
		apiKey,
	)

	if err == nil {

		selectedCar.Photos = photos.Photos
		selectedCar.PrimaryImage = photos.PrimaryImage

		if photos.PrimaryImage != "" {
			selectedCar.Image = photos.PrimaryImage
		}
	}

	tmpl, err := template.ParseFiles(
		"templates/car.html",
	)

	if err != nil {

		http.Error(
			w,
			"Unable to load car page",
			http.StatusInternalServerError,
		)

		return
	}

	err = tmpl.Execute(w, selectedCar)

	if err != nil {
		fmt.Println("Template error:", err)
	}
}

func aboutHandler(w http.ResponseWriter, r *http.Request) {

	tmpl, err := template.ParseFiles(
		"templates/about.html",
	)

	if err != nil {

		http.Error(
			w,
			"Unable to load about page",
			http.StatusInternalServerError,
		)

		return
	}

	tmpl.Execute(w, nil)
}

func compareHandler(w http.ResponseWriter, r *http.Request) {

	apiKey := os.Getenv("VEHICLES_API_KEY")

	if apiKey == "" {

		http.Error(
			w,
			"VEHICLES_API_KEY is not set",
			http.StatusInternalServerError,
		)

		return
	}

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

	tmpl, err := template.ParseFiles(
		"templates/compare.html",
	)

	if err != nil {

		http.Error(
			w,
			"Unable to load compare page",
			http.StatusInternalServerError,
		)

		return
	}

	err = tmpl.Execute(
		w,
		CompareData{
			Cars:     cars,
			CarsJSON: template.JS(carsJSON),
		},
	)

	if err != nil {
		fmt.Println("Template error:", err)
	}
}

func compareSpecsHandler(w http.ResponseWriter, r *http.Request) {

	apiKey := os.Getenv("VEHICLES_API_KEY")

	if apiKey == "" {

		http.Error(
			w,
			"VEHICLES_API_KEY is not set",
			http.StatusInternalServerError,
		)

		return
	}

	vin := r.URL.Query().Get("vin")

	if vin == "" {

		http.Error(
			w,
			"VIN is required",
			http.StatusBadRequest,
		)

		return
	}

	specs, err := api.GetSpecifications(
		vin,
		apiKey,
	)

	if err != nil {

		http.Error(
			w,
			"Unable to get vehicle specifications",
			http.StatusInternalServerError,
		)

		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	err = json.NewEncoder(w).Encode(specs)

	if err != nil {

		http.Error(
			w,
			"Unable to encode specifications",
			http.StatusInternalServerError,
		)

		return
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

	fmt.Println(os.Getenv("VEHICLES_API_KEY"))

	fmt.Println(
		"VÉLOCITY server running on http://localhost:8080",
	)

	err := http.ListenAndServe(
		":8080",
		nil,
	)

	if err != nil {
		fmt.Println(err)
	}
}
