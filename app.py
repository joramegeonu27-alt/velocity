"""VÉLOCITY — premium automotive discovery, powered by Python + FastAPI.

Run: uvicorn app:app --reload --port 8080
API access is optional. Local car data is the dependable fallback.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from api import vehicles

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "cars.json"
PAGE_SIZE = 6
CATALOGUE_TTL = 300
LIVE_FAILURE_RETRY_SECONDS = 60
SLUG_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-]{0,79}$")

logger = logging.getLogger("velocity")
app = FastAPI(title="VÉLOCITY", docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")
_cache_lock = threading.Lock()
_live_cache: tuple[float, list[dict[str, Any]]] | None = None
_live_unavailable_until = 0.0


def _number(value: Any) -> str:
    try:
        number = int(value)
    except (ValueError, TypeError):
        return "—"
    return f"{number:,}" if number else "—"


def _value(value: Any) -> str:
    return str(value) if value is not None and str(value).strip() else "Not listed"


def _power(value: Any) -> str:
    try:
        return f"{int(value):,} hp" if int(value) > 0 else "Not listed"
    except (ValueError, TypeError):
        return "Not listed"


def _year(value: Any) -> str:
    try:
        return str(int(value)) if int(value) > 0 else "Not listed"
    except (ValueError, TypeError):
        return "Not listed"


templates.env.globals.update(number=_number, value=_value, power=_power, year=_year,
                             speed=_value, money=lambda n: f"${int(n):,}" if n else "On request")


def _text(value: Any) -> str:
    return str(value or "").strip()


def _int(value: Any) -> int:
    try:
        return max(0, int(value))
    except (ValueError, TypeError, OverflowError):
        return 0


def normalize_car(row: dict[str, Any]) -> dict[str, Any]:
    """All templates receive the same predictable keys, for curated and live cars."""
    defaults: dict[str, Any] = {
        "id": "", "brand": "", "model": "", "year": 0, "horsepower": 0,
        "engine": "", "top_speed": "", "zero_to_sixty": "", "image": "",
        "photos": [], "price": 0, "miles": 0, "fuel": "", "drivetrain": "",
        "transmission": "", "color": "", "condition": "", "cylinders": "",
        "displacement": "", "seats": "", "doors": "", "body_class": "",
        "engine_config": "", "series": "", "manufacturer": "",
    }
    for key in defaults:
        if key in row:
            defaults[key] = row[key]
    for key in ("year", "horsepower", "price", "miles"):
        defaults[key] = _int(defaults[key])
    for key in defaults:
        if key not in ("year", "horsepower", "price", "miles", "photos"):
            defaults[key] = _text(defaults[key])
    photos = defaults["photos"]
    defaults["photos"] = [url for url in photos if isinstance(url, str) and url.startswith(("https://", "/static/"))][:24] if isinstance(photos, list) else []
    if defaults["image"] and not defaults["image"].startswith(("https://", "/static/")):
        defaults["image"] = ""
    if not defaults["image"] and defaults["photos"]:
        defaults["image"] = defaults["photos"][0]
    return defaults


def load_cars() -> list[dict[str, Any]]:
    """Read and validate the offline catalogue. A bad file is not silently ignored."""
    with DATA_FILE.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("Vehicle catalogue must be an array")
    seen: set[str] = set()
    cars: list[dict[str, Any]] = []
    for row in data:
        if not isinstance(row, dict):
            raise ValueError("Invalid car record")
        car = normalize_car(row)
        if not car["id"] or not car["brand"] or not car["model"] or not SLUG_PATTERN.fullmatch(car["id"]):
            raise ValueError("Incomplete or invalid vehicle in catalogue")
        if car["id"] in seen:
            raise ValueError("Duplicate car ID in catalogue")
        seen.add(car["id"])
        cars.append(car)
    return cars


def _listing_to_car(item: dict[str, Any]) -> dict[str, Any]:
    return normalize_car({
        "id": item.get("vin"), "brand": item.get("make"),
        "model": item.get("model"), "year": item.get("year"),
        "engine": item.get("trim"), "image": item.get("primaryImage"),
        "price": item.get("price"), "miles": item.get("miles"),
        "fuel": item.get("fuel"), "drivetrain": item.get("drivetrain"),
        "transmission": item.get("transmission"), "color": item.get("color"),
        "condition": item.get("condition"), "body_class": item.get("body_style"),
    })


def catalogue() -> tuple[list[dict[str, Any]], str]:
    """Use live listings only when available; cache them to avoid repeated paid calls."""
    fallback = load_cars()
    key = os.getenv("VEHICLES_API_KEY", "").strip()
    if key:
        global _live_cache, _live_unavailable_until
        with _cache_lock:
            now = time.monotonic()
            if _live_cache and _live_cache[0] > now:
                return _live_cache[1], "Live listings · up to 200 results"
            if _live_unavailable_until > now:
                return fallback, "Curated showcase · illustrative specifications"
            try:
                listings = vehicles.search_vehicles(key, limit=200)
                live_cars = []
                seen = set()
                for item in listings:
                    car = _listing_to_car(item)
                    if car["id"] and car["brand"] and car["model"] and car["id"] not in seen:
                        seen.add(car["id"])
                        live_cars.append(car)
                if live_cars:
                    _live_cache = (time.monotonic() + CATALOGUE_TTL, live_cars)
                    _live_unavailable_until = 0.0
                    return live_cars, "Live listings · up to 200 results"
            except (vehicles.VehicleAPIError, ValueError) as exc:
                logger.warning("Live listings unavailable; using curated catalogue: %s", exc)
            # Repeated upstream failures should not slow down every user request.
            _live_unavailable_until = time.monotonic() + LIVE_FAILURE_RETRY_SECONDS
    return fallback, "Curated showcase · illustrative specifications"


def filter_and_sort(cars: list[dict[str, Any]], query: str = "", brand: str = "", order: str = "featured") -> list[dict[str, Any]]:
    needle = query.casefold().strip()
    selected = [car for car in cars
                if (not brand or car["brand"].casefold() == brand.casefold())
                and (not needle or needle in f'{car["brand"]} {car["model"]} {car["engine"]} {car["year"]}'.casefold())]
    if order == "power":
        selected.sort(key=lambda car: car["horsepower"], reverse=True)
    elif order == "year":
        selected.sort(key=lambda car: car["year"], reverse=True)
    elif order == "name":
        selected.sort(key=lambda car: f'{car["brand"]} {car["model"]}'.casefold())
    return selected


def local_car(car_id: str) -> dict[str, Any] | None:
    return next((car for car in load_cars() if car["id"] == car_id), None)


def apply_specs(car: dict[str, Any], specs: dict[str, Any]) -> None:
    """Only override local values if the provider supplied useful fields."""
    mapping = {"engine_hp": "horsepower", "cylinders": "cylinders",
               "displacement_l": "displacement", "seats": "seats", "doors": "doors",
               "body_class": "body_class", "engine_config": "engine_config",
               "series": "series", "manufacturer": "manufacturer",
               "fuel_primary": "fuel", "drive_type": "drivetrain",
               "transmission_style": "transmission"}
    for src, dst in mapping.items():
        if _text(specs.get(src)):
            car[dst] = _int(specs[src]) if dst == "horsepower" else _text(specs[src])
    if car["displacement"]:
        car["engine"] = f'{car["displacement"]}L {car["engine_config"]}'.strip()


def find_car(car_id: str) -> dict[str, Any] | None:
    car = local_car(car_id)
    if car:
        return car
    api_key = os.getenv("VEHICLES_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        vin = vehicles.normalize_vin(car_id)
    except ValueError:
        return None
    try:
        item = vehicles.get_vehicle(vin, api_key)
    except vehicles.VehicleAPIError:
        return None
    car = normalize_car({"id": vin, "brand": item.get("make"), "model": item.get("model"),
                         "year": item.get("year"), "engine": item.get("engine"),
                         "fuel": item.get("fuel"), "transmission": item.get("transmission")})
    if not car["brand"] or not car["model"]:
        return None
    try:
        apply_specs(car, vehicles.get_specifications(vin, api_key))
    except vehicles.VehicleAPIError:
        pass
    try:
        photos = vehicles.get_photos(vin, api_key)
        photo_list = photos.get("photos", [])
        if isinstance(photo_list, list):
            car["photos"] = [p for p in photo_list if isinstance(p, str) and p.startswith("https://")][:24]
        first_image = photos.get("primaryImage")
        if isinstance(first_image, str) and first_image.startswith("https://"):
            car["image"] = first_image
        elif car["photos"]:
            car["image"] = car["photos"][0]
    except vehicles.VehicleAPIError:
        pass
    return car


def local_specs(car: dict[str, Any]) -> dict[str, str]:
    mapping = {"make": "brand", "model": "model", "year": "year", "engine_hp": "horsepower",
               "displacement_l": "displacement", "engine_config": "engine_config", "cylinders": "cylinders",
               "fuel_primary": "fuel", "drive_type": "drivetrain", "transmission_style": "transmission",
               "body_class": "body_class", "seats": "seats", "doors": "doors", "manufacturer": "manufacturer",
               "series": "series"}
    return {dest: str(car[source]) if car[source] else "" for dest, source in mapping.items()}


def page(request: Request, filename: str, **context: Any) -> HTMLResponse:
    return templates.TemplateResponse(request, filename, context)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/static/") and request.url.path.endswith((".js", ".css", ".svg")):
        response.headers["Cache-Control"] = "public, max-age=3600"
    return response


@app.exception_handler(404)
async def missing_page(request: Request, exc: HTTPException):
    return HTMLResponse(templates.get_template("notfound.html").render(
        {"request": request, "title": "Page not found — VÉLOCITY", "active": ""}), status_code=404)


@app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
def home(request: Request):
    cars, _ = catalogue()
    return page(request, "index.html", title="VÉLOCITY — The art of the drive",
                active="home", featured=cars[:3])


@app.api_route("/cars", methods=["GET", "HEAD"], response_class=HTMLResponse)
def cars_page(request: Request):
    cars, source = catalogue()
    query = request.query_params.get("q", "").strip()[:80]
    brand = request.query_params.get("brand", "").strip()[:60]
    order = request.query_params.get("sort", "featured")
    if order not in {"power", "year", "name"}:
        order = "featured"
    brands = sorted({car["brand"] for car in cars if car["brand"]}, key=str.casefold)
    matches = filter_and_sort(cars, query, brand, order)
    total = len(matches)
    total_pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)
    try:
        requested_page = int(request.query_params.get("page", "1"))
    except ValueError:
        requested_page = 1
    current_page = min(total_pages, max(1, requested_page))
    start = (current_page - 1) * PAGE_SIZE
    end = min(start + PAGE_SIZE, total)

    def page_url(next_page: int) -> str:
        params = {"page": next_page}
        if query:
            params["q"] = query
        if brand:
            params["brand"] = brand
        if order != "featured":
            params["sort"] = order
        return f"/cars?{urlencode(params)}#collection"

    return page(request, "cars.html", title="The collection — VÉLOCITY", active="cars",
                cars=matches[start:end], brands=brands, query=query, brand=brand, sort=order,
                page=current_page, total_pages=total_pages, total_cars=total,
                from_index=start + 1 if total else 0, to_index=end,
                prev_url=page_url(current_page - 1) if current_page > 1 else "",
                next_url=page_url(current_page + 1) if current_page < total_pages else "",
                source_label=source)


@app.api_route("/cars/{car_id}", methods=["GET", "HEAD"], response_class=HTMLResponse)
def car_details(request: Request, car_id: str):
    if len(car_id) > 80 or not SLUG_PATTERN.fullmatch(car_id):
        raise HTTPException(status_code=404)
    car = find_car(car_id)
    if car is None:
        raise HTTPException(status_code=404)
    return page(request, "car.html", title=f'{car["brand"]} {car["model"]} — VÉLOCITY',
                active="cars", car=car)


@app.api_route("/compare", methods=["GET", "HEAD"], response_class=HTMLResponse)
def compare_page(request: Request):
    cars, _ = catalogue()
    return page(request, "compare.html", title="Compare vehicles — VÉLOCITY",
                active="compare", cars=cars)


@app.api_route("/about", methods=["GET", "HEAD"], response_class=HTMLResponse)
def about_page(request: Request):
    return page(request, "about.html", title="Our story — VÉLOCITY", active="about")


@app.api_route("/api/compare/specs", methods=["GET", "HEAD"])
def comparison_specs(vin: str = ""):
    car_id = vin.strip()[:80]
    if not car_id:
        raise HTTPException(status_code=400, detail="Vehicle ID is required")
    car = local_car(car_id)
    if car is not None:
        return JSONResponse(local_specs(car), headers={"Cache-Control": "public, max-age=120"})
    api_key = os.getenv("VEHICLES_API_KEY", "").strip()
    try:
        normalized_vin = vehicles.normalize_vin(car_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Vehicle not found") from None
    if not api_key:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    try:
        specs = vehicles.get_specifications(normalized_vin, api_key)
    except vehicles.VehicleAPIError:
        raise HTTPException(status_code=502, detail="Vehicle specifications unavailable") from None
    return JSONResponse(specs, headers={"Cache-Control": "public, max-age=120"})


@app.api_route("/healthz", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=int(os.getenv("PORT", "8080")))
