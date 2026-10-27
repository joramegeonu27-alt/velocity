package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"velocity/api"
)

const pageSize = 6

type Car struct {
	ID           string   `json:"id"`
	Brand        string   `json:"brand"`
	Model        string   `json:"model"`
	Year         int      `json:"year"`
	Horsepower   int      `json:"horsepower"`
	Engine       string   `json:"engine"`
	TopSpeed     string   `json:"top_speed"`
	ZeroToSixty  string   `json:"zero_to_sixty"`
	Image        string   `json:"image"`
	Photos       []string `json:"photos"`
	PrimaryImage string   `json:"primary_image"`
	Price        int      `json:"price"`
	Miles        int      `json:"miles"`
	Fuel         string   `json:"fuel"`
	Drivetrain   string   `json:"drivetrain"`
	Transmission string   `json:"transmission"`
	Color        string   `json:"color"`
	Condition    string   `json:"condition"`
	Cylinders    string   `json:"cylinders"`
	Displacement string   `json:"displacement"`
	Seats        string   `json:"seats"`
	Doors        string   `json:"doors"`
	BodyClass    string   `json:"body_class"`
	EngineConfig string   `json:"engine_config"`
	Series       string   `json:"series"`
	Manufacturer string   `json:"manufacturer"`
}

type PageData struct {
	// Only trusted, repository-owned CSS is supplied to this field.
	DiscoveryCSS template.CSS
	Active       string
	Title        string
	Description  string
	Featured     []Car
	Cars         []Car
	Car          *Car
	Brands       []string
	Query        string
	Brand        string
	Sort         string
	Page         int
	TotalPages   int
	TotalCars    int
	From         int
	To           int
	PrevURL      string
	NextURL      string
	SourceLabel  string
}

func apiKey() string { return strings.TrimSpace(os.Getenv("VEHICLES_API_KEY")) }

func loadCars() ([]Car, error) {
	data, err := os.ReadFile("data/cars.json")
	if err != nil {
		return nil, fmt.Errorf("read catalogue: %w", err)
	}
	var cars []Car
	if err := json.Unmarshal(data, &cars); err != nil {
		return nil, fmt.Errorf("parse catalogue: %w", err)
	}
	for _, car := range cars {
		if car.ID == "" || car.Brand == "" || car.Model == "" {
			return nil, errors.New("catalogue contains an incomplete car")
		}
	}
	return cars, nil
}

func listingToCar(item api.Listing) Car {
	return Car{ID: item.VIN, Brand: item.Make, Model: item.Model, Year: item.Year, Engine: item.Trim,
		Image: item.Image, Price: item.Price, Miles: item.Miles, Fuel: item.Fuel,
		Drivetrain: item.Drivetrain, Transmission: item.Transmission, Color: item.Color, Condition: item.Condition}
}

// The curated catalogue is always usable offline. With a key, live listings are
// optional; a failed upstream request never breaks the public website.
func catalogue(r *http.Request) ([]Car, string, error) {
	fallback, err := loadCars()
	if err != nil {
		return nil, "", err
	}
	if key := apiKey(); key != "" {
		result, err := api.SearchVehiclesContext(r.Context(), key, 200, 0)
		if err == nil && len(result.Results) > 0 {
			cars := make([]Car, 0, len(result.Results))
			for _, item := range result.Results {
				if item.VIN != "" && item.Make != "" && item.Model != "" {
					cars = append(cars, listingToCar(item))
				}
			}
			if len(cars) > 0 {
				return cars, "Live listings · up to 200 results", nil
			}
		}
		if err != nil {
			log.Printf("live catalogue unavailable (using curated collection): %v", err)
		}
	}
	return fallback, "Curated showcase · illustrative specifications", nil
}

func trimQuery(input string, max int) string {
	input = strings.TrimSpace(input)
	chars := []rune(input)
	if len(chars) > max {
		return string(chars[:max])
	}
	return input
}

func filterAndSort(cars []Car, q, brand, order string) []Car {
	q = strings.ToLower(strings.TrimSpace(q))
	filtered := make([]Car, 0, len(cars))
	for _, car := range cars {
		if brand != "" && !strings.EqualFold(car.Brand, brand) {
			continue
		}
		if q != "" && !strings.Contains(strings.ToLower(car.Brand+" "+car.Model+" "+car.Engine+" "+strconv.Itoa(car.Year)), q) {
			continue
		}
		filtered = append(filtered, car)
	}
	switch order {
	case "power":
		sort.SliceStable(filtered, func(i, j int) bool { return filtered[i].Horsepower > filtered[j].Horsepower })
	case "year":
		sort.SliceStable(filtered, func(i, j int) bool { return filtered[i].Year > filtered[j].Year })
	case "name":
		sort.SliceStable(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].Brand+" "+filtered[i].Model) < strings.ToLower(filtered[j].Brand+" "+filtered[j].Model)
		})
	}
	return filtered
}

func uniqueBrands(cars []Car) []string {
	seen := make(map[string]bool)
	result := make([]string, 0)
	for _, car := range cars {
		if car.Brand != "" && !seen[car.Brand] {
			seen[car.Brand] = true
			result = append(result, car.Brand)
		}
	}
	sort.Strings(result)
	return result
}

func templateFuncs() template.FuncMap {
	return template.FuncMap{
		"number": func(v int) string {
			if v == 0 {
				return "—"
			}
			s := strconv.Itoa(v)
			for i := len(s) - 3; i > 0; i -= 3 {
				s = s[:i] + "," + s[i:]
			}
			return s
		},
		"value": func(v string) string {
			if strings.TrimSpace(v) == "" {
				return "Not listed"
			}
			return v
		},
		"power": func(v int) string {
			if v == 0 {
				return "Not listed"
			}
			return fmt.Sprintf("%d hp", v)
		},
		"year": func(v int) string {
			if v == 0 {
				return "Not listed"
			}
			return strconv.Itoa(v)
		},
		"speed": func(v string) string {
			if v == "" {
				return "Not listed"
			}
			return v
		},
		"money": func(v int) string {
			if v == 0 {
				return "On request"
			}
			return "$" + strconv.Itoa(v)
		},
	}
}

var templateOnce sync.Once
var compiledTemplates *template.Template
var compileErr error

func render(w http.ResponseWriter, filename string, data PageData) {
	renderStatus(w, http.StatusOK, filename, data)
}

func renderStatus(w http.ResponseWriter, status int, filename string, data PageData) {
	templateOnce.Do(func() {
		compiledTemplates, compileErr = template.New("velocity").Funcs(templateFuncs()).ParseGlob("templates/*.html")
	})
	tmpl, err := compiledTemplates, compileErr
	if err != nil {
		log.Printf("parse template %s: %v", filename, err)
		http.Error(w, "Page unavailable", http.StatusInternalServerError)
		return
	}
	// Buffer rendering to avoid partially written responses on template errors.
	var output strings.Builder
	if err := tmpl.ExecuteTemplate(&output, filename, data); err != nil {
		log.Printf("render template %s: %v", filename, err)
		http.Error(w, "Page unavailable", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	w.Write([]byte(output.String()))
}

func allowGet(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == http.MethodGet || r.Method == http.MethodHead {
		return true
	}
	w.Header().Set("Allow", "GET, HEAD")
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	return false
}

func pageNotFound(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.NotFound(w, r)
		return
	}
	renderStatus(w, http.StatusNotFound, "notfound.html", PageData{Title: "Page not found — VÉLOCITY"})
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		pageNotFound(w, r)
		return
	}
	if !allowGet(w, r) {
		return
	}
	cars, _, err := catalogue(r)
	if err != nil {
		http.Error(w, "Catalogue temporarily unavailable", 500)
		return
	}
	if len(cars) > 3 {
		cars = cars[:3]
	}
	render(w, "index.html", PageData{Active: "home", Title: "VÉLOCITY — The art of the drive", Featured: cars})
}

func carsHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/cars" {
		pageNotFound(w, r)
		return
	}
	if !allowGet(w, r) {
		return
	}
	cars, source, err := catalogue(r)
	if err != nil {
		http.Error(w, "Catalogue temporarily unavailable", 500)
		return
	}
	q := trimQuery(r.URL.Query().Get("q"), 80)
	brand := trimQuery(r.URL.Query().Get("brand"), 60)
	order := r.URL.Query().Get("sort")
	if order != "power" && order != "year" && order != "name" {
		order = "featured"
	}
	brands := uniqueBrands(cars)
	filtered := filterAndSort(cars, q, brand, order)
	total := len(filtered)
	totalPages := (total + pageSize - 1) / pageSize
	if totalPages == 0 {
		totalPages = 1
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	if page > totalPages {
		page = totalPages
	}
	start := (page - 1) * pageSize
	end := start + pageSize
	if end > total {
		end = total
	}
	base := url.Values{}
	if q != "" {
		base.Set("q", q)
	}
	if brand != "" {
		base.Set("brand", brand)
	}
	if order != "featured" {
		base.Set("sort", order)
	}
	pageLink := func(p int) string {
		v := url.Values{}
		for key, values := range base {
			v[key] = append([]string(nil), values...)
		}
		v.Set("page", strconv.Itoa(p))
		return "/cars?" + v.Encode() + "#collection"
	}
	data := PageData{Active: "cars", Title: "The collection — VÉLOCITY", Cars: filtered[start:end], Brands: brands, Query: q, Brand: brand, Sort: order, Page: page, TotalPages: totalPages, TotalCars: total, SourceLabel: source}
	if total > 0 {
		data.From = start + 1
		data.To = end
	}
	if page > 1 {
		data.PrevURL = pageLink(page - 1)
	}
	if page < totalPages {
		data.NextURL = pageLink(page + 1)
	}
	render(w, "cars.html", data)
}

func findLocalCar(id string) (*Car, error) {
	cars, err := loadCars()
	if err != nil {
		return nil, err
	}
	for _, car := range cars {
		if car.ID == id {
			copy := car
			return &copy, nil
		}
	}
	return nil, nil
}

func applySpecs(car *Car, s api.VehicleSpecifications) {
	if hp, err := strconv.Atoi(s.EngineHP); err == nil && hp > 0 {
		car.Horsepower = hp
	}
	car.Cylinders = s.Cylinders
	car.Displacement = s.DisplacementL
	car.Seats = s.Seats
	car.Doors = s.Doors
	car.BodyClass = s.BodyClass
	car.EngineConfig = s.EngineConfig
	car.Series = s.Series
	car.Manufacturer = s.Manufacturer
	if s.FuelPrimary != "" {
		car.Fuel = s.FuelPrimary
	}
	if s.DriveType != "" {
		car.Drivetrain = s.DriveType
	}
	if s.TransmissionStyle != "" {
		car.Transmission = s.TransmissionStyle
	}
	if s.DisplacementL != "" {
		car.Engine = s.DisplacementL + "L " + s.EngineConfig
	}
}

var vinPattern = regexp.MustCompile(`^[A-HJ-NPR-Z0-9]{17}$`)

func findCar(r *http.Request, id string) (*Car, error) {
	if car, err := findLocalCar(id); err != nil || car != nil {
		return car, err
	}
	key := apiKey()
	if key == "" || !vinPattern.MatchString(strings.ToUpper(id)) {
		return nil, nil
	}
	// VIN lookup works even if the vehicle wasn't in the first listings page.
	id = strings.ToUpper(id)
	vehicle, err := api.GetVehicleContext(r.Context(), id, key)
	if err != nil {
		return nil, nil
	}
	car := &Car{ID: id, Brand: vehicle.Make, Model: vehicle.Model, Year: vehicle.Year, Engine: vehicle.Engine, Fuel: vehicle.Fuel, Transmission: vehicle.Transmission}
	if s, err := api.GetSpecificationsContext(r.Context(), id, key); err == nil {
		applySpecs(car, s)
	}
	if photos, err := api.GetVehiclePhotosContext(r.Context(), id, key); err == nil {
		car.Photos = photos.Photos
		car.Image = photos.PrimaryImage
		if car.Image == "" && len(car.Photos) > 0 {
			car.Image = car.Photos[0]
		}
	}
	return car, nil
}

func carDetailHandler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/cars/")
	if id == "" || id == "/" || strings.Contains(id, "/") || len(id) > 80 {
		pageNotFound(w, r)
		return
	}
	car, err := findCar(r, id)
	if err != nil {
		http.Error(w, "Unable to load vehicle", 500)
		return
	}
	if car == nil {
		pageNotFound(w, r)
		return
	}
	render(w, "car.html", PageData{Active: "cars", Title: car.Brand + " " + car.Model + " — VÉLOCITY", Car: car})
}

func aboutHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/about" {
		pageNotFound(w, r)
		return
	}
	if !allowGet(w, r) {
		return
	}
	render(w, "about.html", PageData{Active: "about", Title: "Our story — VÉLOCITY"})
}

func compareHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/compare" {
		pageNotFound(w, r)
		return
	}
	if !allowGet(w, r) {
		return
	}
	cars, _, err := catalogue(r)
	if err != nil {
		http.Error(w, "Unable to load collection", 500)
		return
	}
	render(w, "compare.html", PageData{Active: "compare", Title: "Compare vehicles — VÉLOCITY", Cars: cars})
}

func localSpecs(car *Car) map[string]string {
	hp := ""
	if car.Horsepower > 0 {
		hp = strconv.Itoa(car.Horsepower)
	}
	year := ""
	if car.Year > 0 {
		year = strconv.Itoa(car.Year)
	}
	return map[string]string{
		"make": car.Brand, "model": car.Model, "year": year, "engine_hp": hp,
		"displacement_l": car.Displacement, "engine_config": car.EngineConfig, "cylinders": car.Cylinders,
		"fuel_primary": car.Fuel, "drive_type": car.Drivetrain, "transmission_style": car.Transmission,
		"body_class": car.BodyClass, "seats": car.Seats, "doors": car.Doors, "manufacturer": car.Manufacturer,
		"series": car.Series,
	}
}

func compareSpecsHandler(w http.ResponseWriter, r *http.Request) {
	if !allowGet(w, r) {
		return
	}
	id := trimQuery(r.URL.Query().Get("vin"), 80)
	if id == "" {
		http.Error(w, "Vehicle ID is required", 400)
		return
	}
	if car, err := findLocalCar(id); err != nil {
		http.Error(w, "Unable to load vehicle", 500)
		return
	} else if car != nil {
		writeJSON(w, localSpecs(car))
		return
	}
	key := apiKey()
	if !vinPattern.MatchString(strings.ToUpper(id)) || key == "" {
		http.Error(w, "Vehicle not found", 404)
		return
	}
	specs, err := api.GetSpecificationsContext(r.Context(), strings.ToUpper(id), key)
	if err != nil {
		http.Error(w, "Vehicle specifications unavailable", 502)
		return
	}
	writeJSON(w, specs)
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=120")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("json encode: %v", err)
	}
}

func secure(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}

func routes() http.Handler {
	mux := http.NewServeMux()
	static := http.StripPrefix("/static/", http.FileServer(http.Dir("static")))
	mux.Handle("/static/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !allowGet(w, r) {
			return
		}
		if strings.HasSuffix(path.Base(r.URL.Path), ".css") || strings.HasSuffix(path.Base(r.URL.Path), ".js") || strings.HasSuffix(path.Base(r.URL.Path), ".svg") {
			w.Header().Set("Cache-Control", "public, max-age=3600")
		}
		static.ServeHTTP(w, r)
	}))
	mux.HandleFunc("/", homeHandler)
	mux.HandleFunc("/cars", carsHandler)
	mux.HandleFunc("/cars/", carDetailHandler)
	mux.HandleFunc("/about", aboutHandler)
	mux.HandleFunc("/discover", discoverPremiumHandler)
	mux.HandleFunc("/api/nhtsa/models", nhtsa.modelsHandler)
	mux.HandleFunc("/api/nhtsa/makes", nhtsa.makesHandler)
	mux.HandleFunc("/api/discovery/vin", discovery.vinHandler)
	mux.HandleFunc("/api/discovery/recalls", discovery.recallsHandler)
	mux.HandleFunc("/api/discovery/safety", discovery.safetyHandler)
	mux.HandleFunc("/api/discovery/rating", discovery.ratingHandler)
	mux.HandleFunc("/compare", compareHandler)
	mux.HandleFunc("/api/compare/specs", compareSpecsHandler)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if !allowGet(w, r) {
			return
		}
		writeJSON(w, map[string]string{"status": "ok"})
	})
	return secure(mux)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{Addr: ":" + port, Handler: routes(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 25 * time.Second, IdleTimeout: 60 * time.Second}
	log.Printf("VÉLOCITY running at http://localhost:%s", port)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
