# JWT OpenAI Chatbot Agent

This is a simple custom API agent for the Agent Manager platform. It provides a chat interface powered by OpenAI's `gpt-3.5-turbo` model and requires JWT-based OAuth 2.0 authentication.

## Features

- **OpenAI Integration:** Uses OpenAI's chat completions API to respond to user messages.
- **JWT Authentication:** Secures the `/chat` endpoint using OAuth 2.0 Bearer tokens (JWT).
- **Custom API Agent:** Configured to run on port `8080` with a base path of `/`, conforming to the requirements in the provided specifications.
- **OpenAPI Specification:** Includes an `openapi.yaml` file defining the endpoints and the JWT security scheme.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Environment Variables:**
   You must set the `OPENAI_API_KEY` environment variable before running the agent.
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   ```

3. **Run the Application:**
   ```bash
   python main.py
   ```
   The application will start on `http://0.0.0.0:8080`.

## API Documentation

Once the server is running, you can view the automatically generated API documentation by navigating to:
- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`

## Agent Manager Configuration

To configure this in the Agent Manager platform:
- **Agent Type:** Custom API Agent
- **OpenAPI Spec Path:** `openapi.yaml`
- **Port:** `8080`
- **Base Path:** `/`
