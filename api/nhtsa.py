"""Free NHTSA vPIC catalog discovery. No key required; no car imagery supplied."""
from __future__ import annotations
import json
import re
import threading
import time
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'
_CACHE: dict[str, tuple[float, list[dict]]] = {}
_LOCK = threading.Lock()
TTL = 24 * 3600

class NHTSAError(Exception):
    pass

def _get(endpoint: str, params: dict | None = None) -> list[dict]:
    url = f'{BASE}/{endpoint}?{urlencode({**(params or {}), "format": "json"})}'
    with _LOCK:
        cached = _CACHE.get(url)
        if cached and cached[0] > time.monotonic():
            return cached[1]
    try:
        request = Request(url, headers={'User-Agent': 'VelocityAutomotiveDiscovery/1.0', 'Accept': 'application/json'})
        with urlopen(request, timeout=7) as response:
            data = json.load(response)
        results = data.get('Results')
        if not isinstance(results, list):
            raise ValueError('Unexpected response format')
    except (OSError, TimeoutError, ValueError, json.JSONDecodeError) as error:
        raise NHTSAError('Vehicle directory is temporarily unavailable') from error
    with _LOCK:
        _CACHE[url] = (time.monotonic() + TTL, results)
    return results

def _make(value: str) -> str:
    value = value.strip()
    if not 1 <= len(value) <= 60 or not re.fullmatch(r"[\w .&'()-]+", value, re.UNICODE):
        raise ValueError('Enter a valid manufacturer name')
    return value

def models(make: str, year: int | None = None) -> list[dict]:
    make = _make(make)
    if year is not None and not 1980 <= year <= 2030:
        raise ValueError('Year must be between 1980 and 2030')
    if year is None:
        rows = _get('GetModelsForMake/' + quote(make, safe=''))
    else:
        rows = _get('GetModelsForMakeYear/make/' + quote(make, safe='') + '/modelyear/' + str(year), {'vehicleType': 'car'})
    unique = {}
    for item in rows:
        brand = str(item.get('Make_Name') or make).strip()
        model = str(item.get('Model_Name') or '').strip()
        if model:
            unique[(brand.casefold(), model.casefold())] = {'make': brand, 'model': model, 'year': year}
    return sorted(unique.values(), key=lambda row: (row['make'], row['model']))
