# Google Maps OpenAI MCP Agent

A FastAPI-based chat agent that uses OpenAI for reasoning and a Google Maps MCP server for map operations.

## What it does

The agent connects to one or more remote Google Maps MCP servers via:

`AGENT_MCP_1_URL`

It loads the available map tools at runtime and lets OpenAI decide when to call them.

## Tools exposed by the MCP server

The MCP server exposes five Google Maps tools covering places, weather, routes, and related lookups.

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set environment variables:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export AGENT_MCP_1_URL="http://your-mcp-server/mcp"
export AGENT_MCP_1_API_KEY="your-mcp-api-key"
```

Optional overrides:

```bash
export OPENAI_MODEL="gpt-4o-mini"
export MAX_TOOL_ROUNDS="6"
```

If you want to point at multiple MCP servers, set `AGENT_MCP_1_URL` to a comma-separated list of URLs.

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
  -d '{"session_id":"s1","message":"Find places in Paris near the Eiffel Tower and summarize them"}'
```
