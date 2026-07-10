# Google Maps Agent — Outdoor Event Logistics Pipeline

A FastAPI service combining two capabilities:

1. **`/chat`** — Original OpenAI + Google Maps MCP general-purpose assistant (unchanged)
2. **`/analyze`** — LangGraph multi-agent pipeline for **Outdoor Event & Wedding Logistics** risk assessment

---

## Architecture: LangGraph Pipeline

```
START
  └─► supervisor_router      Parses venue & date from free-form query
        └─► maps_node         Google Maps MCP: geocode, hotels, parking, accessibility
              └─► weather_node  Native OpenWeather 4.0 One-Call API (no MCP)
                    └─► risk_analyzer_node  LLM risk synthesis report
                          └─► END
```

### State Schema

```python
class EventLogisticsState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    venue_address: str
    event_date: str          # YYYY-MM-DD
    resolved_lat: Optional[float]
    resolved_lon: Optional[float]
    maps_data: dict          # hotel density, accessibility & parking
    weather_data: dict       # OpenWeather 4.0 payload
    risk_analysis: str       # final synthesised narrative
```

---

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy `.env` and fill in your keys:

```bash
# Required for both /chat and /analyze
OPENAI_API_KEY=your_openai_api_key

# Required for Google Maps MCP (/chat + maps_node in /analyze)
AGENT_MCP_1_URL=https://mapstools.googleapis.com/mcp
AGENT_MCP_1_API_KEY=your_google_maps_api_key

# Required for weather_node in /analyze (native OpenWeather 4.0)
OPENWEATHER_API_KEY=your_openweather_api_key

# Optional
OPENAI_MODEL=gpt-4o-mini
MAX_TOOL_ROUNDS=6
```

> **Note:** `OPENWEATHER_API_KEY` requires an active OpenWeather One Call API 4.0 subscription.

### 3. Run

```bash
python main.py
```

Server starts at `http://0.0.0.0:9099`.

---

## API Endpoints

### `POST /chat` — General Maps Assistant

```bash
curl -X POST http://localhost:9099/chat \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"s1","message":"Find restaurants near the Eiffel Tower"}'
```

### `POST /analyze` — Event Logistics Risk Assessment

```bash
curl -X POST http://localhost:9099/analyze \
  -H 'Content-Type: application/json' \
  -d '{"query":"Assess Pelican Hill Resort, Newport Beach for an outdoor wedding on October 14, 2026"}'
```

**Response fields:**

| Field | Description |
|---|---|
| `risk_analysis` | Full LLM-generated risk narrative |
| `venue_address` | Extracted venue name |
| `event_date` | Extracted date (YYYY-MM-DD) |
| `resolved_lat` / `resolved_lon` | Geocoded coordinates |
| `maps_data` | Hotels, parking, accessibility summary |
| `weather_data` | OpenWeather 4.0 parsed payload |
| `full_report` | Formatted final report with headers |

### `GET /health` — Health Check

```bash
curl http://localhost:9099/health
```

### Interactive Docs

OpenAPI UI at `http://localhost:9099/docs`

---

## Standalone CLI Test

Test the pipeline without the HTTP server:

```bash
python langgraph_pipeline.py
```

---

## File Structure

```
google-maps-agent/
├── main.py                  # FastAPI app — /chat, /analyze, /health
├── langgraph_pipeline.py    # LangGraph multi-agent pipeline
├── requirements.txt
├── .env
└── openapi.yaml
```
