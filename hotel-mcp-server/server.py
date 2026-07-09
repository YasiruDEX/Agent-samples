"""
Hotel Registry MCP Server
=========================
A Model Context Protocol (MCP) server that provides CRUD tools for managing
the hotel list stored in hotel_data.json.

This server is intended to be used as an MCP proxy from the WSO2 Agent Manager.
It exposes the following tools:
  - list_hotels          : List all registered hotels (with optional filters)
  - get_hotel            : Get a single hotel by hotel_id or name
  - register_hotel       : Register a brand-new hotel
  - update_hotel         : Update one or more fields of an existing hotel
  - delete_hotel         : Remove a hotel from the registry
  - rename_hotel         : Convenience tool to update only the hotel name
"""

from __future__ import annotations

import json
import logging
import re
import threading
import uuid
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Optional

from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("hotel-mcp-server")

# ---------------------------------------------------------------------------
# Persistent data store
# ---------------------------------------------------------------------------
# Default path: the shared hotel_data.json used by the hotel-booking-agent.
# Override via environment variable HOTEL_DATA_PATH if needed.
import os

_DEFAULT_DATA_PATH = (
    Path(__file__).resolve().parent.parent
    / "hotel-booking-agent"
    / "services"
    / "hotel_api"
    / "resources"
    / "hotel_data.json"
)

HOTEL_DATA_PATH = Path(os.getenv("HOTEL_DATA_PATH", str(_DEFAULT_DATA_PATH)))

_lock = threading.Lock()


def _load_data() -> dict[str, Any]:
    """Load the full hotel dataset from disk."""
    if not HOTEL_DATA_PATH.exists():
        logger.warning("hotel_data.json not found at %s; creating empty store.", HOTEL_DATA_PATH)
        HOTEL_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        HOTEL_DATA_PATH.write_text(json.dumps({"hotels": []}, indent=2))
    try:
        return json.loads(HOTEL_DATA_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        logger.error("hotel_data.json is corrupted; returning empty dataset.")
        return {"hotels": []}


def _save_data(data: dict[str, Any]) -> None:
    """Persist the full hotel dataset to disk (atomic-ish write)."""
    tmp = HOTEL_DATA_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(HOTEL_DATA_PATH)
    logger.info("hotel_data.json saved (%d hotels).", len(data.get("hotels", [])))


def _get_hotels() -> list[dict[str, Any]]:
    return _load_data().get("hotels", [])


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _find_by_id(hotels: list[dict[str, Any]], hotel_id: str) -> dict[str, Any] | None:
    for h in hotels:
        if h.get("hotel_id") == hotel_id:
            return h
    return None


def _find_by_name(
    hotels: list[dict[str, Any]], name: str, threshold: float = 0.75
) -> dict[str, Any] | None:
    target = _normalize(name)
    best_hotel = None
    best_score = 0.0
    for h in hotels:
        candidate = _normalize(str(h.get("hotel_name") or ""))
        if not candidate:
            continue
        score = SequenceMatcher(None, target, candidate).ratio()
        if score > best_score:
            best_score = score
            best_hotel = h
    if best_score >= threshold:
        return best_hotel
    return None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# MCP Server
# ---------------------------------------------------------------------------
mcp = FastMCP(
    name="hotel-registry",
    instructions=(
        "You are the hotel registry MCP server. "
        "Use the available tools to list, get, register, update, rename, and delete hotels "
        "in the local hotel_data.json store."
    ),
)


# ---- READ tools -----------------------------------------------------------

@mcp.tool(
    description=(
        "List all registered hotels. Optionally filter by city/country (substring match) "
        "or by minimum rating. Returns a summary list of hotel_id, hotel_name, city, rating, "
        "and is_available."
    )
)
def list_hotels(
    city: Optional[str] = None,
    country: Optional[str] = None,
    min_rating: Optional[float] = None,
    available_only: bool = False,
) -> dict[str, Any]:
    """
    List hotels with optional filters.

    Args:
        city: Filter hotels whose city field contains this substring (case-insensitive).
        country: Filter hotels whose country field contains this substring (case-insensitive).
        min_rating: Only include hotels with rating >= this value.
        available_only: If True, only return hotels where is_available is true.

    Returns:
        A dict with "hotels" (summary list) and "total" count.
    """
    with _lock:
        hotels = _get_hotels()

    results = []
    for h in hotels:
        if city and city.lower() not in str(h.get("city", "")).lower():
            continue
        if country and country.lower() not in str(h.get("country", "")).lower():
            continue
        if min_rating is not None and (h.get("rating") or 0) < min_rating:
            continue
        if available_only and not h.get("is_available", False):
            continue
        results.append(
            {
                "hotel_id": h.get("hotel_id"),
                "hotel_name": h.get("hotel_name"),
                "city": h.get("city"),
                "country": h.get("country"),
                "rating": h.get("rating"),
                "lowest_price": h.get("lowest_price"),
                "is_available": h.get("is_available", True),
            }
        )

    logger.info("list_hotels → %d result(s)", len(results))
    return {"hotels": results, "total": len(results)}


@mcp.tool(
    description=(
        "Get the full details of a single hotel by its hotel_id or by hotel name "
        "(fuzzy match). At least one of hotel_id or hotel_name must be provided."
    )
)
def get_hotel(
    hotel_id: Optional[str] = None,
    hotel_name: Optional[str] = None,
) -> dict[str, Any]:
    """
    Retrieve a single hotel's full record.

    Args:
        hotel_id: Exact hotel identifier (e.g. 'mock-001-paris').
        hotel_name: Hotel name for fuzzy lookup (used when hotel_id is absent).

    Returns:
        The full hotel record dict, or an error dict if not found.
    """
    if not hotel_id and not hotel_name:
        return {"error": "Provide hotel_id or hotel_name."}

    with _lock:
        hotels = _get_hotels()

    hotel: dict[str, Any] | None = None
    if hotel_id:
        hotel = _find_by_id(hotels, hotel_id.strip())
    if hotel is None and hotel_name:
        hotel = _find_by_name(hotels, hotel_name.strip())

    if hotel is None:
        return {"error": f"Hotel not found (hotel_id={hotel_id!r}, hotel_name={hotel_name!r})."}

    logger.info("get_hotel → %s", hotel.get("hotel_id"))
    return hotel


# ---- CREATE tool ----------------------------------------------------------

@mcp.tool(
    description=(
        "Register a new hotel in the hotel registry. "
        "hotel_name and city are required; all other fields are optional. "
        "A unique hotel_id will be generated automatically."
    )
)
def register_hotel(
    hotel_name: str,
    city: str,
    country: Optional[str] = None,
    address: Optional[str] = None,
    description: Optional[str] = None,
    rating: Optional[float] = None,
    lowest_price: Optional[float] = None,
    amenities: Optional[list[str]] = None,
    property_type: Optional[list[str]] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    website: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    is_available: bool = True,
) -> dict[str, Any]:
    """
    Register a brand-new hotel.

    Args:
        hotel_name: Display name of the hotel (required).
        city: City where the hotel is located (required).
        country: Country of the hotel.
        address: Full street address.
        description: Short description.
        rating: Star/quality rating (0.0–5.0).
        lowest_price: Lowest nightly rate in USD.
        amenities: List of amenity strings.
        property_type: List of property type strings (e.g. ['Luxury Hotel']).
        phone: Contact phone number.
        email: Contact email address.
        website: Hotel website URL.
        latitude: GPS latitude.
        longitude: GPS longitude.
        is_available: Whether the hotel is currently accepting bookings.

    Returns:
        The newly created hotel record, or an error dict.
    """
    hotel_name = hotel_name.strip()
    city = city.strip()

    if not hotel_name:
        return {"error": "hotel_name must not be empty."}
    if not city:
        return {"error": "city must not be empty."}

    # Generate a slug-based ID
    slug = re.sub(r"[^a-z0-9]+", "-", hotel_name.lower()).strip("-")
    city_slug = re.sub(r"[^a-z0-9]+", "-", city.lower()).strip("-")
    short_id = uuid.uuid4().hex[:6]
    hotel_id = f"hotel-{slug[:24]}-{city_slug[:16]}-{short_id}"

    new_hotel: dict[str, Any] = {
        "hotel_id": hotel_id,
        "hotel_name": hotel_name,
        "city": city,
        "country": country or "",
        "address": address or "",
        "description": description or "",
        "images": [],
        "rating": rating if rating is not None else 0.0,
        "review_count": 0,
        "amenities": amenities or [],
        "property_type": property_type or [],
        "location": {
            "latitude": latitude or 0.0,
            "longitude": longitude or 0.0,
            "landmark": address or city,
            "distance_from_center": 0.0,
        },
        "contact_info": {
            "phone": phone or "",
            "email": email or "",
            "website": website or "",
        },
        "lowest_price": lowest_price if lowest_price is not None else 0.0,
        "is_available": is_available,
        "created_at": _now_iso(),
    }

    with _lock:
        data = _load_data()
        hotels = data.get("hotels", [])

        # Duplicate name check
        if _find_by_name(hotels, hotel_name, threshold=0.95):
            return {
                "error": f"A hotel with a very similar name already exists: '{hotel_name}'. "
                         "Use update_hotel to modify it, or choose a distinct name."
            }

        hotels.append(new_hotel)
        data["hotels"] = hotels
        _save_data(data)

    logger.info("register_hotel → %s (%s)", hotel_id, hotel_name)
    return {"success": True, "hotel": new_hotel}


# ---- UPDATE tools ---------------------------------------------------------

@mcp.tool(
    description=(
        "Update one or more fields of an existing hotel. "
        "Identify the hotel via hotel_id (exact) or hotel_name (fuzzy). "
        "Only the fields you pass will be updated; omitted fields are left unchanged."
    )
)
def update_hotel(
    hotel_id: Optional[str] = None,
    hotel_name: Optional[str] = None,
    new_hotel_name: Optional[str] = None,
    city: Optional[str] = None,
    country: Optional[str] = None,
    address: Optional[str] = None,
    description: Optional[str] = None,
    rating: Optional[float] = None,
    lowest_price: Optional[float] = None,
    amenities: Optional[list[str]] = None,
    property_type: Optional[list[str]] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    website: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    is_available: Optional[bool] = None,
) -> dict[str, Any]:
    """
    Update fields on an existing hotel record.

    Args:
        hotel_id: Exact hotel identifier to look up.
        hotel_name: Hotel name for fuzzy lookup (when hotel_id is absent).
        new_hotel_name: New display name for the hotel.
        city: New city value.
        country: New country value.
        address: New address value.
        description: New description.
        rating: New rating (0.0–5.0).
        lowest_price: New lowest nightly price.
        amenities: Replacement amenities list.
        property_type: Replacement property type list.
        phone: New phone number.
        email: New email address.
        website: New website URL.
        latitude: New GPS latitude.
        longitude: New GPS longitude.
        is_available: Set hotel availability.

    Returns:
        The updated hotel record, or an error dict.
    """
    if not hotel_id and not hotel_name:
        return {"error": "Provide hotel_id or hotel_name to identify the hotel."}

    with _lock:
        data = _load_data()
        hotels = data.get("hotels", [])

        hotel: dict[str, Any] | None = None
        if hotel_id:
            hotel = _find_by_id(hotels, hotel_id.strip())
        if hotel is None and hotel_name:
            hotel = _find_by_name(hotels, hotel_name.strip())

        if hotel is None:
            return {"error": f"Hotel not found (hotel_id={hotel_id!r}, hotel_name={hotel_name!r})."}

        # Apply top-level scalar updates
        if new_hotel_name is not None:
            hotel["hotel_name"] = new_hotel_name.strip()
        if city is not None:
            hotel["city"] = city.strip()
        if country is not None:
            hotel["country"] = country.strip()
        if address is not None:
            hotel["address"] = address.strip()
        if description is not None:
            hotel["description"] = description.strip()
        if rating is not None:
            hotel["rating"] = rating
        if lowest_price is not None:
            hotel["lowest_price"] = lowest_price
        if amenities is not None:
            hotel["amenities"] = amenities
        if property_type is not None:
            hotel["property_type"] = property_type
        if is_available is not None:
            hotel["is_available"] = is_available

        # Nested location
        if latitude is not None or longitude is not None or address is not None:
            loc = hotel.setdefault("location", {})
            if latitude is not None:
                loc["latitude"] = latitude
            if longitude is not None:
                loc["longitude"] = longitude
            if address is not None:
                loc["landmark"] = address.strip()

        # Nested contact_info
        if phone is not None or email is not None or website is not None:
            ci = hotel.setdefault("contact_info", {})
            if phone is not None:
                ci["phone"] = phone.strip()
            if email is not None:
                ci["email"] = email.strip()
            if website is not None:
                ci["website"] = website.strip()

        hotel["updated_at"] = _now_iso()

        data["hotels"] = hotels
        _save_data(data)

    logger.info("update_hotel → %s", hotel.get("hotel_id"))
    return {"success": True, "hotel": hotel}


@mcp.tool(
    description=(
        "Convenience tool: rename a hotel. Identify it by hotel_id (exact) "
        "or hotel_name (fuzzy) and supply the new name."
    )
)
def rename_hotel(
    new_name: str,
    hotel_id: Optional[str] = None,
    hotel_name: Optional[str] = None,
) -> dict[str, Any]:
    """
    Rename an existing hotel.

    Args:
        new_name: The new display name for the hotel.
        hotel_id: Exact hotel identifier.
        hotel_name: Hotel name for fuzzy lookup (when hotel_id is absent).

    Returns:
        Success message with old and new name, or an error dict.
    """
    if not new_name or not new_name.strip():
        return {"error": "new_name must not be empty."}
    if not hotel_id and not hotel_name:
        return {"error": "Provide hotel_id or hotel_name to identify the hotel to rename."}

    with _lock:
        data = _load_data()
        hotels = data.get("hotels", [])

        hotel: dict[str, Any] | None = None
        if hotel_id:
            hotel = _find_by_id(hotels, hotel_id.strip())
        if hotel is None and hotel_name:
            hotel = _find_by_name(hotels, hotel_name.strip())

        if hotel is None:
            return {"error": f"Hotel not found (hotel_id={hotel_id!r}, hotel_name={hotel_name!r})."}

        old_name = hotel.get("hotel_name", "")
        hotel["hotel_name"] = new_name.strip()
        hotel["updated_at"] = _now_iso()

        data["hotels"] = hotels
        _save_data(data)

    logger.info("rename_hotel %s → '%s'", hotel.get("hotel_id"), new_name)
    return {
        "success": True,
        "hotel_id": hotel.get("hotel_id"),
        "old_name": old_name,
        "new_name": hotel["hotel_name"],
        "updated_at": hotel["updated_at"],
    }


# ---- DELETE tool ----------------------------------------------------------

@mcp.tool(
    description=(
        "Delete / deregister a hotel from the registry. "
        "Identify the hotel by hotel_id (exact) or hotel_name (fuzzy). "
        "This operation is irreversible."
    )
)
def delete_hotel(
    hotel_id: Optional[str] = None,
    hotel_name: Optional[str] = None,
) -> dict[str, Any]:
    """
    Permanently remove a hotel from the local hotel_data.json registry.

    Args:
        hotel_id: Exact hotel identifier.
        hotel_name: Hotel name for fuzzy lookup (when hotel_id is absent).

    Returns:
        Success confirmation, or an error dict if the hotel was not found.
    """
    if not hotel_id and not hotel_name:
        return {"error": "Provide hotel_id or hotel_name to identify the hotel to delete."}

    with _lock:
        data = _load_data()
        hotels = data.get("hotels", [])

        hotel: dict[str, Any] | None = None
        if hotel_id:
            hotel = _find_by_id(hotels, hotel_id.strip())
        if hotel is None and hotel_name:
            hotel = _find_by_name(hotels, hotel_name.strip())

        if hotel is None:
            return {"error": f"Hotel not found (hotel_id={hotel_id!r}, hotel_name={hotel_name!r})."}

        removed_id = hotel.get("hotel_id")
        removed_name = hotel.get("hotel_name")
        hotels = [h for h in hotels if h.get("hotel_id") != removed_id]
        data["hotels"] = hotels
        _save_data(data)

    logger.info("delete_hotel → removed %s (%s)", removed_id, removed_name)
    return {
        "success": True,
        "deleted_hotel_id": removed_id,
        "deleted_hotel_name": removed_name,
        "remaining_hotels": len(hotels),
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Hotel Registry MCP Server")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse", "streamable-http"],
        default="stdio",
        help="MCP transport to use (default: stdio)",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host for SSE / HTTP transport (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Port for SSE / HTTP transport (default: 8080)",
    )
    parser.add_argument(
        "--data-path",
        default=None,
        help="Override the path to hotel_data.json",
    )
    args = parser.parse_args()

    if args.data_path:
        os.environ["HOTEL_DATA_PATH"] = args.data_path
        HOTEL_DATA_PATH = Path(args.data_path)
        logger.info("Using hotel data path: %s", HOTEL_DATA_PATH)

    logger.info(
        "Starting Hotel Registry MCP Server [transport=%s, host=%s, port=%s, data=%s]",
        args.transport,
        args.host,
        args.port,
        HOTEL_DATA_PATH,
    )

    if args.transport == "stdio":
        mcp.run(transport="stdio")
    else:
        # For network transports, configure host/port via the Settings object
        # (FastMCP.run() does not accept host/port kwargs directly).
        from mcp.server.transport_security import TransportSecuritySettings

        mcp.settings.host = args.host
        mcp.settings.port = args.port
        # Relax DNS-rebinding protection so remote clients can connect
        mcp.settings.transport_security = TransportSecuritySettings(
            enable_dns_rebinding_protection=False,
            allowed_hosts=["*"],
            allowed_origins=["*"],
        )
        mcp.run(transport=args.transport)
