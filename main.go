package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
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

func homeHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/index.html")
	if err != nil {
		http.Error(w, "Unable to load page", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, nil)

}

func carsHandler(w http.ResponseWriter, r *http.Request) {

	data, err := os.ReadFile("data/cars.json")
	if err != nil {
		http.Error(w, "Unable to load cars", http.StatusInternalServerError)
		return
	}

	var cars []Car

	err = json.Unmarshal(data, &cars)
	if err != nil {
		http.Error(w, "Unable to read car data", http.StatusInternalServerError)
		return
	}

	tmpl, err := template.ParseFiles("templates/cars.html")
	if err != nil {
		http.Error(w, "Unable to load cars page", http.StatusInternalServerError)
		return
	}

	tmpl.Execute(w, cars)
}

func main() {

	// Serve CSS, JavaScript and images
	staticFiles := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", staticFiles))

	// Homepage
	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/cars", carsHandler)

	fmt.Println("VÉLOCITY server running on http://localhost:8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println(err)
	}
}
