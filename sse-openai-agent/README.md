# SSE OpenAI Chatbot Agent

This is a sample agent that demonstrates how to implement Server-Sent Events (SSE) streaming using FastAPI and the OpenAI API.

## Prerequisites

1. Set your OpenAI API key as an environment variable:
   ```bash
   export OPENAI_API_KEY="your-api-key"
   ```

## Setup

1. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the agent:
   ```bash
   python main.py
   ```

## Usage

You can test the streaming endpoint using `curl`:

```bash
curl -X POST http://localhost:9099/chat \
     -H "Content-Type: application/json" \
     -d '{"session_id": "123", "message": "Tell me a joke"}'
```

You should see the response streamed chunk by chunk in the terminal.
