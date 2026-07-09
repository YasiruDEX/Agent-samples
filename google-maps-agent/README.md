# Hotel OpenAI MCP Agent

A FastAPI-based chat agent that uses OpenAI for reasoning and the hotel registry MCP server for hotel operations.

## What it does

The agent connects to the remote hotel MCP server at:

`http://default-default.gateway.localhost:19080/default/hotel-registry/mcp`

It loads the hotel tools from the MCP server at runtime and lets OpenAI decide when to call them.

## Tools exposed by the MCP server

- `list_hotels`
- `get_hotel`
- `register_hotel`
- `update_hotel`
- `rename_hotel`
- `delete_hotel`

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set environment variables:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export HOTEL_MCP_API_KEY="your-mcp-api-key"
```

If the gateway expects a different header name, override it:

```bash
export HOTEL_MCP_AUTH_HEADER="x-api-key"
export HOTEL_MCP_AUTH_PREFIX=""
```

Optional overrides:

```bash
export HOTEL_MCP_URL="http://default-default.gateway.localhost:19080/default/hotel-registry/mcp"
export OPENAI_MODEL="gpt-4o-mini"
```

3. Run the agent:

```bash
python main.py
```

The server runs on `http://0.0.0.0:9099`.

## API

- `POST /chat`
- `GET /health`
- OpenAPI docs at `/docs`

## Example request

```bash
curl -X POST http://localhost:9099/chat \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"s1","message":"Find hotels in Paris under $300"}'
```
