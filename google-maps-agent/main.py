"""
Google Maps OpenAI MCP Agent
============================
A FastAPI chat agent that uses OpenAI for reasoning and a Google Maps MCP
server for map-related tools.

Uses the MCP SDK directly (no langchain-mcp-adapters) to avoid OTel/httpx
compatibility issues with streamablehttp_client.
"""

from __future__ import annotations

import json
import logging
import os
import traceback
from typing import Any

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from openai import AsyncOpenAI
from pydantic import BaseModel

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_TOOL_ROUNDS = int(os.getenv("MAX_TOOL_ROUNDS", "6"))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("google-maps-openai-mcp-agent")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Google Maps OpenAI MCP Agent",
    description=(
        "A chat agent that uses OpenAI and a remote Google Maps MCP server "
        "for places, weather, routes, and related map operations."
    ),
    version="1.0.0",
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal Server Error",
            "detail": str(exc),
            "traceback": "".join(
                traceback.format_exception(type(exc), exc, exc.__traceback__)
            ),
        },
    )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    response: str


# ---------------------------------------------------------------------------
# MCP helpers
# ---------------------------------------------------------------------------


def _mcp_url() -> str:
    return os.getenv("AGENT_MCP_1_URL", "").strip()


def _mcp_server_urls() -> list[str]:
    raw_urls = _mcp_url()
    return [url.strip() for url in raw_urls.split(",") if url.strip()]


def _mcp_api_key() -> str:
    return os.environ.get("AGENT_MCP_1_API_KEY", "").strip()


def _tool_definitions_from_mcp(tools: list[Any]) -> list[dict[str, Any]]:
    """Convert MCP Tool objects to OpenAI function definitions."""
    definitions = []
    for tool in tools:
        # inputSchema is a dict on mcp.types.Tool
        schema = tool.inputSchema if isinstance(tool.inputSchema, dict) else {}
        definitions.append(
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description or f"MCP tool {tool.name}",
                    "parameters": schema,
                },
            }
        )
    return definitions


def _stringify_mcp_result(result: Any) -> str:
    """Serialize an MCP CallToolResult to a string for the OpenAI messages."""
    if result is None:
        return ""
    # result.content is a list of TextContent / ImageContent / etc.
    content = getattr(result, "content", None)
    if content is None:
        return str(result)
    parts: list[str] = []
    for item in content:
        if hasattr(item, "text"):
            parts.append(item.text)
        elif hasattr(item, "model_dump"):
            parts.append(json.dumps(item.model_dump(mode="json", exclude_none=True), ensure_ascii=False))
        else:
            parts.append(str(item))
    return "\n".join(parts) if parts else ""


# ---------------------------------------------------------------------------
# Core chat loop
# ---------------------------------------------------------------------------


async def _run_chat_loop(message: str) -> str:
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if not openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY environment variable is not set.",
        )

    mcp_urls = _mcp_server_urls()
    mcp_key = _mcp_api_key()
    if not mcp_urls or not mcp_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AGENT_MCP_1_URL and AGENT_MCP_1_API_KEY environment variables must be set.",
        )

    openai_client = AsyncOpenAI(api_key=openai_api_key)

    system_prompt = (
        "You are a Google Maps assistant. Use the available MCP tools for "
        "places, weather, routes, and related map lookups. Do not invent map "
        "data. If required fields are missing for a tool call, ask a concise "
        "follow-up question."
    )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message},
    ]

    # Use first MCP URL (extend here if multi-server support is needed)
    mcp_url = mcp_urls[0]
    mcp_headers = {"X-Goog-Api-Key": mcp_key}

    async with streamablehttp_client(mcp_url, headers=mcp_headers) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            list_result = await session.list_tools()
            mcp_tools = list_result.tools
            tool_definitions = _tool_definitions_from_mcp(mcp_tools)
            tool_names = {t.name for t in mcp_tools}

            logger.info("Loaded %d MCP tools from %s", len(mcp_tools), mcp_url)

            for _ in range(MAX_TOOL_ROUNDS):
                completion = await openai_client.chat.completions.create(
                    model=DEFAULT_MODEL,
                    messages=messages,
                    tools=tool_definitions,
                    tool_choice="auto",
                )
                choice = completion.choices[0]
                assistant_message = choice.message

                if assistant_message.tool_calls:
                    messages.append(
                        {
                            "role": "assistant",
                            "content": assistant_message.content,
                            "tool_calls": [
                                {
                                    "id": tc.id,
                                    "type": "function",
                                    "function": {
                                        "name": tc.function.name,
                                        "arguments": tc.function.arguments,
                                    },
                                }
                                for tc in assistant_message.tool_calls
                            ],
                        }
                    )

                    for tool_call in assistant_message.tool_calls:
                        tool_name = tool_call.function.name
                        arguments_text = tool_call.function.arguments or "{}"

                        try:
                            arguments = json.loads(arguments_text)
                        except json.JSONDecodeError:
                            arguments = {}

                        if tool_name not in tool_names:
                            raise HTTPException(
                                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail=f"Unknown MCP tool requested: {tool_name}",
                            )

                        logger.info("Calling MCP tool %s with %s", tool_name, arguments)
                        tool_result = await session.call_tool(tool_name, arguments)

                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "content": _stringify_mcp_result(tool_result),
                            }
                        )
                    continue

                content = assistant_message.content or ""
                return content.strip() or "I could not produce a response."

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="The agent reached the maximum number of tool rounds.",
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.post("/chat", response_model=ChatResponse, summary="Chat with the Google Maps agent")
async def chat(chat_request: ChatRequest):
    response = await _run_chat_loop(chat_request.message)
    return ChatResponse(response=response)


@app.get("/health", summary="Health check")
async def health():
    return {
        "status": "ok",
        "agent": "Google Maps OpenAI MCP Agent",
        "mcp_url": _mcp_url(),
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9099)
