"""The country an address is in, for the admin dashboard's map. IP Geolocation by DB-IP (db-ip.com), CC BY 4.0.

Only the two letter country code is ever stored, never the address."""

import ipaddress
import logging
from functools import cache

import maxminddb
from config import settings
from fastapi import Request

logger = logging.getLogger(__name__)


@cache
def _reader() -> maxminddb.Reader | None:
    """Opened once. None when the database is missing, as when its download failed at build time."""
    try:
        return maxminddb.open_database(settings.COUNTRY_DB)
    except (OSError, maxminddb.InvalidDatabaseError):
        logger.warning("No country database at %s, countries are not recorded", settings.COUNTRY_DB)
        return None


def country_for(address: str | None) -> str | None:
    """The two letter country code of a public address. None for a private or unknown one, or without the database."""
    try:
        ip = ipaddress.ip_address(address or "")
    except ValueError:
        return None
    if not ip.is_global:
        return None
    reader = _reader()
    record = reader.get(address) if reader else None
    country = record.get("country") if isinstance(record, dict) else None
    code = country.get("iso_code") if isinstance(country, dict) else None
    return code if isinstance(code, str) and len(code) == 2 else None


def request_country(request: Request) -> str | None:
    """The country of the address a request came from. Caddy passes the visitor's address through, and uvicorn trusts it."""
    return country_for(request.client.host if request.client else None)
