package main

import "net/http"

func manufacturersHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/manufacturers" {
		pageNotFound(w, r)
		return
	}
	if !allowGet(w, r) {
		return
	}
	render(w, "manufacturers.html", PageData{
		Active:      "manufacturers",
		Title:       "Manufacturers — VÉLOCITY | Discover automotive marques",
		Description: "Discover car manufacturers worldwide and explore their models and generations.",
	})
}
