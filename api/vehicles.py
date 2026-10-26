"""Bounded, validated requests to the optional vehicles.dev API.

The site remains fully usable with local JSON data when the API is unavailable.
Keep API credentials server-side; never place them in HTML or JavaScript.
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlencode

import httpx

BASE_URL = "https://api.vehicles.dev/v1/vehicles"
VIN_RE = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")
TIMEOUT = httpx.Timeout(8.0, connect=4.0)
MAX_RESPONSE_BYTES = 4 * 1024 * 1024


class VehicleAPIError(Exception):
    """An upstream response was unavailable or did not match the expected format."""


def _get_json(path: str, api_key: str) -> dict[str, Any]:
    if not api_key:
        raise VehicleAPIError("An API key is required")
    try:
        with httpx.Client(timeout=TIMEOUT, follow_redirects=False) as client:
            with client.stream(
                "GET", f"{BASE_URL}/{path}",
                headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
            ) as response:
                response.raise_for_status()
                length = int(response.headers.get("content-length", "0") or 0)
                if length > MAX_RESPONSE_BYTES:
                    raise VehicleAPIError("Upstream response is too large")
                body = bytearray()
                for chunk in response.iter_bytes():
                    body.extend(chunk)
                    if len(body) > MAX_RESPONSE_BYTES:
                        raise VehicleAPIError("Upstream response is too large")
                result = httpx.Response(200, content=bytes(body)).json()
                if not isinstance(result, dict):
                    raise VehicleAPIError("Unexpected upstream response")
                return result
    except (httpx.HTTPError, ValueError) as exc:
        # Never leak Authorization headers or internal exceptions to a browser.
        raise VehicleAPIError("Vehicle data provider unavailable") from exc


def normalize_vin(vin: str) -> str:
    normalized = vin.strip().upper()
    if not VIN_RE.fullmatch(normalized):
        raise ValueError("Invalid VIN")
    return normalized


def search_vehicles(api_key: str, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
    limit = max(1, min(500, limit))
    offset = max(0, offset)
    response = _get_json(f"listings?{urlencode({'limit': limit, 'offset': offset})}", api_key)
    listings = response.get("results", [])
    if not isinstance(listings, list):
        raise VehicleAPIError("Invalid listings payload")
    return [listing for listing in listings if isinstance(listing, dict)]


def get_vehicle(vin: str, api_key: str) -> dict[str, Any]:
    response = _get_json(f"vin/{normalize_vin(vin)}", api_key)
    vehicle = response.get("vehicle")
    if not isinstance(vehicle, dict):
        raise VehicleAPIError("Invalid vehicle payload")
    return vehicle


def get_specifications(vin: str, api_key: str) -> dict[str, Any]:
    response = _get_json(f"specifications/{normalize_vin(vin)}", api_key)
    specs = response.get("specifications")
    if not isinstance(specs, dict):
        raise VehicleAPIError("Invalid specifications payload")
    return specs


def get_photos(vin: str, api_key: str) -> dict[str, Any]:
    return _get_json(f"photos/{normalize_vin(vin)}", api_key)
