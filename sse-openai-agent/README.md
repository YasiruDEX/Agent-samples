# ShopFlow SSE Customer Support Agent

A production-ready AI customer support agent built with **FastAPI**, **LangGraph**, and **OpenAI**, streaming responses in real-time via **Server-Sent Events (SSE)**.

## Architecture

```
sse-openai-agent/
├── main.py              # FastAPI app — SSE endpoint, session routing
├── agent/
│   ├── __init__.py
│   ├── graph.py         # LangGraph StateGraph & compilation (singleton)
│   ├── state.py         # TypedDict agent state (messages)
│   ├── tools.py         # track_order & process_refund async tools
│   └── prompts.py       # System prompt & business guardrails
├── requirements.txt
├── openapi.yaml
└── README.md
```

## Features

- **SSE Streaming** — tokens stream in real-time via `EventSourceResponse`
- **LangGraph Orchestration** — reactive tool-calling loop (assistant ↔ tools)
- **Two Custom Tools**:
  - `track_order(order_id)` — fetches order shipping status
  - `process_refund(order_id, reason)` — initiates a refund if eligible
- **Per-Session Memory** — `InMemorySaver` checkpointer keyed on `session_id`
- **Business Guardrails**:
  - Never processes a refund without a reason
  - Triggers `human_handoff` SSE event when user is frustrated
- **Typed SSE Events** — `message`, `tool_use`, `tool_result`, `human_handoff`, `error`, `done`
- **Graceful Disconnect** — cleans up streams when clients disconnect

## Prerequisites

- Python 3.10+
- An OpenAI API key

## Setup

```bash
# 1. Navigate to the agent directory
cd sse-openai-agent

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"
# Or create a .env file:
# echo "OPENAI_API_KEY=your-api-key-here" > .env

# 5. Start the server
python main.py
```

The server starts on **http://localhost:9099**.

## SSE Event Protocol

| Event type      | Payload                                                       |
|-----------------|---------------------------------------------------------------|
| `message`       | `{"content": "<token>"}`                                     |
| `tool_use`      | `{"tool": "track_order", "input": {"order_id": "12345"}}`    |
| `tool_result`   | `{"tool": "track_order", "output": "{\"status\":\"Shipped\"}"}`|
| `human_handoff` | `{"reason": "User requested human agent"}`                   |
| `error`         | `{"error": "<message>"}`                                     |
| `done`          | `[DONE]`                                                     |

## Test Scenarios

### 1. Basic greeting
```bash
curl -N -X POST http://localhost:9099/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "s1", "message": "Hello! I need some help."}'
```

### 2. Track an order
```bash
curl -N -X POST http://localhost:9099/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "s1", "message": "Where is my order 12301?"}'
```

### 3. Refund without reason (guardrail — agent should ask for reason first)
```bash
curl -N -X POST http://localhost:9099/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "s1", "message": "I want a refund for order 12301."}'
```

### 4. Refund with reason
```bash
curl -N -X POST http://localhost:9099/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "s1", "message": "The reason is it arrived damaged."}'
```

### 5. Human handoff trigger
```bash
curl -N -X POST http://localhost:9099/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "s1", "message": "This is ridiculous! I want to speak to a supervisor!"}'
```

### 6. Memory continuity (re-use session_id)
```bash
curl -N -X POST http://localhost:9099/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "s1", "message": "What was the status of my order again?"}'
```

### 7. Health check
```bash
curl http://localhost:9099/health
```

## Mock Order Data

| Order ID | Status    | ETA    | Item                |
|----------|-----------|--------|---------------------|
| 12300    | Shipped   | 2 days | Wireless Headphones |
| 12301    | Delivered | —      | Running Shoes       |
| 12302    | Delayed   | 5 days | Coffee Maker        |
| 12303    | Shipped   | 3 days | Laptop Stand        |
| 123*     | Shipped   | 2 days | (any other 123* ID) |
| Other    | Not Found | —      | —                   |
