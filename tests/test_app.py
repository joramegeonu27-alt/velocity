"""Regression checks for routes, templates, local data, security and API fallback."""
import json

import pytest
from bs4 import BeautifulSoup
from fastapi.testclient import TestClient

import app as server
from api import vehicles


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("VEHICLES_API_KEY", raising=False)
    server._live_cache = None
    server._live_unavailable_until = 0.0
    with TestClient(server.app) as test_client:
        yield test_client


@pytest.mark.parametrize("url,content", [
    ("/", "BEYOND SPEED."),
    ("/cars", "The"),
    ("/cars/bmw-m4", "M4 Competition"),
    ("/compare", "Choose the"),
    ("/about", "Built for"),
])
def test_pages(client, url, content):
    response = client.get(url)
    assert response.status_code == 200, response.text[:350]
    assert "text/html" in response.headers["content-type"]
    assert content in response.text
    assert "/static/css/velocity-next.css" in response.text
    assert "{%" not in response.text
    assert "{{" not in response.text
    assert response.headers["x-frame-options"] == "DENY"


def test_car_cards_show_brand_and_links(client):
    soup = BeautifulSoup(client.get("/cars").text, "html.parser")
    cards = soup.select(".vehicle-card")
    assert len(cards) == 6
    first = cards[0]
    assert first.select_one(".eyebrow.small").text.strip() == "BMW"
    assert first.select_one(".vehicle-photo")["href"] == "/cars/bmw-m4"
    assert first.select_one(".vehicle-photo img")["alt"] == "BMW M4 Competition"


def test_search_brand_order_and_pagination(client):
    soup = BeautifulSoup(client.get("/cars?q=Porsche").text, "html.parser")
    assert [x["data-id"] for x in soup.select(".vehicle-card")] == ["porsche-911"]
    soup = BeautifulSoup(client.get("/cars?brand=BMW").text, "html.parser")
    assert len(soup.select(".vehicle-card")) == 1
    assert soup.select_one(".vehicle-card")["data-id"] == "bmw-m4"
    soup = BeautifulSoup(client.get("/cars?sort=power").text, "html.parser")
    assert soup.select_one(".vehicle-card")["data-id"] == "lamborghini-revuelto"
    soup = BeautifulSoup(client.get("/cars?sort=name").text, "html.parser")
    assert soup.select_one(".vehicle-card")["data-id"] == "aston-vantage"
    soup = BeautifulSoup(client.get("/cars?sort=year").text, "html.parser")
    assert soup.select_one(".vehicle-card")["data-id"] == "bmw-m4"
    response = client.get("/cars?page=999")
    assert "PAGE 2 / 2" in response.text
    assert "mclaren-artura" in response.text
    assert "PAGE 1 / 2" in client.get("/cars?page=nope").text
    assert "No vehicles found." in client.get("/cars?q=abracadabra").text
    assert "sort=power" in client.get("/cars?sort=power&page=1").text


def test_query_escaped(client):
    response = client.get("/cars", params={"q": '<script>alert("oops")</script>'})
    assert response.status_code == 200
    assert '<script>alert("oops")</script>' not in response.text
    assert "&lt;script&gt;" in response.text
    assert '<option value="BMW"' in client.get("/cars?brand=BMW").text


def test_errors_and_methods(client):
    for route in ["/missing", "/cars/missing", "/cars/a/b", "/about/extra", "/cars/xyz%3Cbad%3E"]:
        response = client.get(route)
        assert response.status_code == 404, route
        assert "Wrong turn." in response.text
    assert client.post("/cars").status_code == 405
    assert client.head("/").status_code == 200
    assert client.head("/cars").status_code == 200
    assert client.get("/api/compare/specs").status_code == 400
    assert client.get("/api/compare/specs?vin=unknown").status_code == 404
    assert client.get("/healthz").json() == {"status": "ok"}


def test_compare_contract(client):
    response = client.get("/api/compare/specs?vin=bmw-m4")
    assert response.status_code == 200
    assert response.json()["engine_hp"] == "503"
    assert response.json()["make"] == "BMW"
    assert response.headers["cache-control"] == "public, max-age=120"
    soup = BeautifulSoup(client.get("/compare?ids=bmw-m4,porsche-911").text, "html.parser")
    assert len(soup.select(".picker-card")) == 9
    assert soup.select_one("#pickerGrid .picker-card")["data-brand"] == "BMW"
    assert soup.select_one("#compareNow").has_attr("disabled")


def test_images_video_and_headers(client):
    for url in [
        "/static/css/velocity-next.css", "/static/css/style.css",
        "/static/js/cars.js", "/static/js/compare.js",
        "/static/images/car-fallback.svg", "/static/images/collection-poster.jpg",
        "/static/videos/collection-hero.mp4", "/static/videos/home-hero.mp4",
    ]:
        response = client.get(url)
        assert response.status_code == 200, url
        assert len(response.content) > 100
        assert response.headers["x-content-type-options"] == "nosniff"
    assert client.get("/static/js/cars.js").headers["cache-control"] == "public, max-age=3600"


def test_data_validation(tmp_path, monkeypatch):
    file = tmp_path / "cars.json"
    file.write_text(json.dumps([{"id": "a", "brand": "BMW", "model": "M4"},
                                {"id": "a", "brand": "BMW", "model": "M3"}]))
    monkeypatch.setattr(server, "DATA_FILE", file)
    with pytest.raises(ValueError, match="Duplicate"):
        server.load_cars()
    file.write_text('{"not": "an array"}')
    with pytest.raises(ValueError, match="array"):
        server.load_cars()


def test_live_catalogue_fallback_and_dedup(client, monkeypatch):
    monkeypatch.setenv("VEHICLES_API_KEY", "test-key")

    def fail(*args, **kwargs):
        raise vehicles.VehicleAPIError("temporary outage")

    monkeypatch.setattr(vehicles, "search_vehicles", fail)
    cars, label = server.catalogue()
    assert len(cars) == 9 and "Curated" in label

    calls = []

    def mock_search(*args, **kwargs):
        calls.append(1)
        car = {"vin": "JH4KA4650MC000000", "make": "Honda", "model": "NSX", "year": 1991, "primaryImage": ""}
        return [car, car]

    monkeypatch.setattr(vehicles, "search_vehicles", mock_search)
    server._live_unavailable_until = 0.0
    cars, label = server.catalogue()
    assert len(cars) == 1 and cars[0]["model"] == "NSX"
    assert "Live" in label
    assert len(server.catalogue()[0]) == 1 and len(calls) == 1
    server._live_cache = None


def test_vin_and_remote_specifications(client, monkeypatch):
    assert vehicles.normalize_vin("jh4ka4650mc000000") == "JH4KA4650MC000000"
    for bad in ["foo", "I" * 17, "Z" * 21, "A" * 16 + "/"]:
        with pytest.raises(ValueError):
            vehicles.normalize_vin(bad)
    monkeypatch.setenv("VEHICLES_API_KEY", "key")
    monkeypatch.setattr(vehicles, "get_specifications", lambda vin, key: {"engine_hp": "430", "make": "Test"})
    response = client.get("/api/compare/specs?vin=JH4KA4650MC000000")
    assert response.status_code == 200 and response.json()["engine_hp"] == "430"
    monkeypatch.setattr(vehicles, "get_specifications", lambda vin, key: (_ for _ in ()).throw(vehicles.VehicleAPIError()))
    assert client.get("/api/compare/specs?vin=JH4KA4650MC000000").status_code == 502


def test_discover_page_loads():
    from fastapi.testclient import TestClient
    from app import app
    response = TestClient(app).get('/discover')
    assert response.status_code == 200
    assert 'Discover' in response.text


def test_nhtsa_models_validation():
    from fastapi.testclient import TestClient
    from app import app
    response = TestClient(app).get('/api/nhtsa/models?make=BMW&year=1800')
    assert response.status_code == 400


def test_discover_renders_mock_data(monkeypatch):
    from fastapi.testclient import TestClient
    import api.nhtsa as nhtsa
    from app import app
    monkeypatch.setattr(nhtsa, 'models', lambda make, year: [{'make': 'BMW', 'model': 'M4', 'year': 2024}])
    response = TestClient(app).get('/discover?make=BMW&year=2024')
    assert response.status_code == 200
    assert 'M4' in response.text
    response = TestClient(app).get('/api/nhtsa/models?make=BMW&year=2024')
    assert response.status_code == 200
    assert response.json()['count'] == 1


def test_collection_directory_lookup_is_distinct_from_curated_cards(client, monkeypatch):
    from api import nhtsa
    monkeypatch.setattr(nhtsa, "models", lambda make, year: [{"make": "BMW", "model": "M4", "year": year}])
    response = client.get("/cars?directory_make=BMW&directory_year=2024")
    assert response.status_code == 200
    assert "2024 QUERY" in response.text
    assert "not independent verification of the model" in response.text
    assert len(BeautifulSoup(response.text, "html.parser").select(".vehicle-card")) == 6
    assert len(BeautifulSoup(response.text, "html.parser").select(".directory-list-item")) == 1

def test_collection_directory_validation_and_outage(client, monkeypatch):
    from api import nhtsa
    assert "Year must be" in client.get("/cars?directory_make=BMW&directory_year=1700").text
    def outage(*args, **kwargs):
        raise nhtsa.NHTSAError("Temporary outage")
    monkeypatch.setattr(nhtsa, "models", outage)
    result = client.get("/cars?directory_make=BMW")
    assert result.status_code == 200
    assert "Temporary outage" in result.text
    assert "BMW" in result.text

def test_discover_does_not_claim_year_is_verified(client, monkeypatch):
    from api import nhtsa
    monkeypatch.setattr(nhtsa, "models", lambda make, year: [{"make": make, "model": "128i", "year": year}])
    html = client.get("/discover?make=BMW&year=2024").text
    assert "2024 QUERY" in html
    assert "not independent production-year verification" in html
