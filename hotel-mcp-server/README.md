# Hotel Registry MCP Server

A **Model Context Protocol (MCP)** server that exposes **full CRUD operations** over the local `hotel_data.json` used by the WSO2 `hotel-booking-agent`.

It is designed to run as an **MCP proxy** from the WSO2 Agent Manager, letting any MCP-compatible client (Anthropic Claude, Cursor, or WSO2 agent) manage the hotel catalogue without touching the file directly.

---

## Tools exposed

| Tool | Description |
|---|---|
| `list_hotels` | List all hotels with optional city / country / rating / availability filters |
| `get_hotel` | Get full details of one hotel by `hotel_id` or fuzzy `hotel_name` |
| `register_hotel` | Register a new hotel (auto-generates `hotel_id`) |
| `update_hotel` | Update any field(s) of an existing hotel |
| `rename_hotel` | Convenience shortcut to rename a hotel |
| `delete_hotel` | Permanently remove a hotel from the registry |

---

## Quickstart

### 1. Install dependencies

```bash
python3.11 -m pip install "mcp[cli]"
```

### 2. Run with `stdio` transport (default – for local MCP clients)

```bash
python3.11 server.py
```

### 3. Run with SSE transport (for WSO2 Agent Manager / remote clients)

```bash
python3.11 server.py --transport sse --host 0.0.0.0 --port 8080
```

### 4. Run with Streamable HTTP transport

```bash
python3.11 server.py --transport streamable-http --host 0.0.0.0 --port 8080
```

### 5. Override the data file path

```bash
python3.11 server.py --data-path /path/to/your/hotel_data.json
# or via environment variable:
HOTEL_DATA_PATH=/path/to/hotel_data.json python3.11 server.py
```

---

## WSO2 Agent Manager – MCP proxy configuration

Add the following entry to your WSO2 Agent Manager MCP configuration so it can discover this server:

```json
{
  "mcpServers": {
    "hotel-registry": {
      "command": "python3.11",
      "args": [
        "/absolute/path/to/hotel-mcp-server/server.py"
      ],
      "env": {
        "HOTEL_DATA_PATH": "/absolute/path/to/hotel_data.json"
      }
    }
  }
}
```

For SSE-based connectivity (when the server runs separately):

```json
{
  "mcpServers": {
    "hotel-registry": {
      "url": "http://localhost:8080/sse"
    }
  }
}
```

---

## Data file

By default the server reads and writes:

```
../hotel-booking-agent/services/hotel_api/resources/hotel_data.json
```

This is the **same file** used by the hotel search and booking APIs, so changes made via the MCP tools are immediately visible to the running booking service (no restart needed).

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `HOTEL_DATA_PATH` | `../hotel-booking-agent/services/hotel_api/resources/hotel_data.json` | Absolute or relative path to the hotel data JSON file |

---

## Tool usage examples

### List hotels in Tokyo
```
list_hotels(city="Tokyo")
```

### Get a hotel by name
```
get_hotel(hotel_name="Azure Bay Resort")
```

### Register a new hotel
```
register_hotel(
    hotel_name="Sakura Grand Hotel",
    city="Osaka, Japan",
    country="Japan",
    address="1-1 Namba, Chuo-ku, Osaka 542-0076",
    rating=4.3,
    lowest_price=180.0,
    amenities=["Free WiFi", "Rooftop Bar", "Spa"],
    phone="+81 6 1234 5678"
)
```

### Rename a hotel
```
rename_hotel(
    hotel_name="Azure Bay Resort Paris",
    new_name="Azure Bay Luxury Resort Paris"
)
```

### Update availability and price
```
update_hotel(
    hotel_id="mock-001-paris",
    lowest_price=320.0,
    is_available=True
)
```

### Delete a hotel
```
delete_hotel(hotel_id="mock-001-paris")
```
