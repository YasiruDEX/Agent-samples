"""
agent/nodes.py
--------------
All four LangGraph node functions for the Event Logistics pipeline.

Pipeline order:
  supervisor_router → maps_node → weather_node → risk_analyzer_node
"""

from __future__ import annotations

import json
import logging
import re

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from agent.config import settings
from agent.prompts import (
    MAPS_SYNTHESIS_PROMPT_TEMPLATE,
    RISK_ANALYZER_SYSTEM_PROMPT,
    RISK_ANALYZER_USER_PROMPT_TEMPLATE,
    SUPERVISOR_SYSTEM_PROMPT,
)
from agent.state import EventLogisticsState
from tools.maps import fetch_maps_intelligence
from tools.weather import fetch_weather_data

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------


def _llm(temperature: float = 0.0) -> ChatOpenAI:
    if settings.use_llm_provider:
        return ChatOpenAI(
            base_url=settings.llm_provider_url,
            api_key=settings.llm_provider_key,
            model=settings.openai_model,
            temperature=temperature,
            timeout=settings.openai_timeout,
            max_retries=settings.openai_max_retries,
        )
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=temperature,
        timeout=settings.openai_timeout,
        max_retries=settings.openai_max_retries,
    )


def _strip_markdown_fences(text: str) -> str:
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Node A – Supervisor Router
# ---------------------------------------------------------------------------


def supervisor_router(state: EventLogisticsState) -> EventLogisticsState:
    """
    Parses the last human message to extract venue_address and event_date.
    Initialises all other state fields to safe defaults before the pipeline runs.
    """
    logger.info("[supervisor_router] Entering node.")

    last_human = next(
        (m.content for m in reversed(state["messages"]) if isinstance(m, HumanMessage)),
        "",
    )

    from datetime import datetime, timezone
    response = _llm(temperature=0.0).invoke(
        [
            SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT),
            HumanMessage(content=last_human),
        ]
    )

    raw = _strip_markdown_fences(response.content)

    try:
        parsed = json.loads(raw)
        venue_address = parsed.get("venue_address", "")
        event_date = parsed.get("event_date", "")
    except Exception as exc:
        logger.error("[supervisor_router] JSON parse failed: %s — raw: %s", exc, raw)
        venue_address = last_human
        event_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    logger.info("[supervisor_router] venue=%r  date=%r", venue_address, event_date)

    return {
        "messages": [
            AIMessage(
                content=f"Supervisor parsed: venue='{venue_address}', date='{event_date}'"
            )
        ],
        "venue_address": venue_address,
        "event_date": event_date,
        "resolved_lat": None,
        "resolved_lon": None,
        "maps_data": {},
        "weather_data": {},
        "risk_analysis": "",
    }


# ---------------------------------------------------------------------------
# Node B – Maps Agent
# ---------------------------------------------------------------------------


async def maps_node(state: EventLogisticsState) -> EventLogisticsState:
    """
    Calls the Google Maps MCP tool-server to:
      1. Geocode the venue → resolved_lat / resolved_lon
      2. Find hotels within 5 miles
      3. Find nearby parking structures
      4. Assess physical accessibility around the venue
    Synthesises all results with an LLM call and writes to maps_data.
    """
    logger.info("[maps_node] Entering node.")

    venue_address = state.get("venue_address", "")
    if not venue_address:
        error_msg = "No venue address in state — cannot run maps_node."
        logger.error("[maps_node] %s", error_msg)
        return {
            "messages": [AIMessage(content=f"Maps Error: {error_msg}")],
            "maps_data": {"error": error_msg},
        }

    try:
        raw = await fetch_maps_intelligence(venue_address)
    except Exception as exc:
        logger.exception("[maps_node] fetch_maps_intelligence raised: %s", exc)
        error_msg = f"Maps agent error: {exc}"
        return {
            "messages": [AIMessage(content=error_msg)],
            "maps_data": {"error": error_msg},
            "resolved_lat": None,
            "resolved_lon": None,
        }

    # Unpack raw data from the maps tool
    lat = raw["lat"]
    lon = raw["lon"]
    venue_data_str = json.dumps(raw["venue_data"], indent=2)[:3000]
    hotels_data_str = json.dumps(raw["hotels_data"], indent=2)[:3000]
    parking_data_str = json.dumps(raw["parking_data"], indent=2)[:2000]
    access_data_str = json.dumps(raw["access_data"], indent=2)[:2000]

    # LLM synthesis → structured maps_data dict
    synthesis_prompt = MAPS_SYNTHESIS_PROMPT_TEMPLATE.format(
        venue_data=venue_data_str,
        hotels_data=hotels_data_str,
        parking_data=parking_data_str,
        access_data=access_data_str,
        lat=lat,
        lon=lon,
    )

    synthesis_raw = _strip_markdown_fences(
        _llm(temperature=0.0).invoke([HumanMessage(content=synthesis_prompt)]).content
    )

    try:
        maps_summary = json.loads(synthesis_raw)
    except Exception:
        # Fallback: build a minimal summary from raw data
        maps_summary = {
            "venue": {
                "latitude": lat,
                "longitude": lon,
                "summary": raw["venue_data"].get("summary", ""),
            },
            "hotels": [
                {"name": h.get("id", "Unknown"), "distance": "within 5 miles", "notes": ""}
                for h in raw["hotels_data"].get("places", [])[:5]
            ],
            "parking": {
                "summary": raw["parking_data"].get("summary", "No parking data"),
                "structures": [],
            },
            "accessibility": {
                "summary": raw["access_data"].get("summary", "No data"),
                "features": [],
            },
        }

    maps_summary.setdefault("venue", {})
    maps_summary["venue"]["latitude"] = lat
    maps_summary["venue"]["longitude"] = lon

    logger.info("[maps_node] Complete. Geocoded at (%s, %s).", lat, lon)
    return {
        "messages": [
            AIMessage(content=f"Maps analysis complete. Venue geocoded at ({lat}, {lon}).")
        ],
        "resolved_lat": lat,
        "resolved_lon": lon,
        "maps_data": maps_summary,
    }


# ---------------------------------------------------------------------------
# Node C – Weather Agent
# ---------------------------------------------------------------------------


async def weather_node(state: EventLogisticsState) -> EventLogisticsState:
    """
    Fetches OpenWeather One-Call 4.0 timeline data natively (no MCP).
    Reads resolved_lat / resolved_lon / event_date from state.
    Writes parsed weather metrics to weather_data.
    """
    logger.info("[weather_node] Entering node.")

    lat = state.get("resolved_lat")
    lon = state.get("resolved_lon")
    event_date = state.get("event_date", "")

    if lat is None or lon is None:
        error_msg = "resolved_lat/lon not set — geocoding may have failed."
        logger.error("[weather_node] %s", error_msg)
        return {
            "messages": [AIMessage(content=f"Weather Error: {error_msg}")],
            "weather_data": {"error": error_msg},
        }

    try:
        weather_data = await fetch_weather_data(lat=lat, lon=lon, event_date=event_date)
    except Exception as exc:
        logger.exception("[weather_node] fetch_weather_data raised: %s", exc)
        error_msg = f"Weather agent error: {exc}"
        return {
            "messages": [AIMessage(content=error_msg)],
            "weather_data": {"error": error_msg},
        }

    logger.info("[weather_node] Complete. Summary: %s", weather_data.get("summary"))
    return {
        "messages": [
            AIMessage(
                content=f"Weather data retrieved for {event_date} at ({lat}, {lon})."
            )
        ],
        "weather_data": weather_data,
    }


# ---------------------------------------------------------------------------
# Node D – Risk Analyzer Agent
# ---------------------------------------------------------------------------


def risk_analyzer_node(state: EventLogisticsState) -> EventLogisticsState:
    """
    Pure LLM reasoning node — no external tools.
    Synthesises maps_data + weather_data into a detailed risk report.
    Writes the narrative to risk_analysis.
    """
    logger.info("[risk_analyzer_node] Entering node.")

    maps_data = state.get("maps_data", {})
    weather_data = state.get("weather_data", {})
    venue_address = state.get("venue_address", "Unknown venue")
    event_date = state.get("event_date", "Unknown date")

    user_prompt = RISK_ANALYZER_USER_PROMPT_TEMPLATE.format(
        venue_address=venue_address,
        event_date=event_date,
        maps_data=json.dumps(maps_data, indent=2)[:5000],
        weather_data=json.dumps(weather_data, indent=2)[:4000],
    )

    try:
        response = _llm(temperature=0.3).invoke(
            [
                SystemMessage(content=RISK_ANALYZER_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )
        risk_report = response.content.strip()
    except Exception as exc:
        logger.exception("[risk_analyzer_node] LLM error: %s", exc)
        risk_report = f"Risk analysis failed due to LLM error: {exc}"

    logger.info("[risk_analyzer_node] Report generated (%d chars).", len(risk_report))

    full_report = (
        f"# Outdoor Event Logistics Risk Assessment\n\n"
        f"**Venue:** {venue_address}  \n"
        f"**Event Date:** {event_date}\n\n"
        f"{risk_report}"
    )

    return {
        "messages": [AIMessage(content=full_report)],
        "risk_analysis": risk_report,
    }
