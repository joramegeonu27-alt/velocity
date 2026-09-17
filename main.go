package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"strings"
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
}

func loadCars() ([]Car, error) {
	data, err := os.ReadFile("data/cars.json")
	if err != nil {
		return nil, err
	}

	var cars []Car

	err = json.Unmarshal(data, &cars)
	if err != nil {
		return nil, err
	}

	return cars, nil
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/index.html")
	if err != nil {
		http.Error(w, "Unable to load page", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, nil)
}

func carsHandler(w http.ResponseWriter, r *http.Request) {
	cars, err := loadCars()
	if err != nil {
		http.Error(w, "Unable to load cars", http.StatusInternalServerError)
		return
	}

	tmpl, err := template.ParseFiles("templates/cars.html")
	if err != nil {
		http.Error(w, "Unable to load cars page", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, cars)
}

func carDetailHandler(w http.ResponseWriter, r *http.Request) {
	carID := strings.TrimPrefix(r.URL.Path, "/cars/")

	if carID == "" {
		http.NotFound(w, r)
		return
	}

	cars, err := loadCars()
	if err != nil {
		http.Error(w, "Unable to load cars", http.StatusInternalServerError)
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

	tmpl, err := template.ParseFiles("templates/car.html")
	if err != nil {
		http.Error(w, "Unable to load car page", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, selectedCar)
}

func main() {

	// Serve CSS, JavaScript and images
	staticFiles := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", staticFiles))

	imgFiles := http.FileServer(http.Dir("images"))
	http.Handle("/images/", http.StripPrefix("/images/", imgFiles))

	// Homepage
	http.HandleFunc("/", homeHandler)

	// Cars collection
	http.HandleFunc("/cars", carsHandler)

	// Individual car
	http.HandleFunc("/cars/", carDetailHandler)

	fmt.Println("VÉLOCITY server running on http://localhost:8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println(err)
	}
}
