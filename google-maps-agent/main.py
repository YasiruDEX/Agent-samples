"""
Google Maps OpenAI MCP Agent
============================
A FastAPI chat agent that uses OpenAI for reasoning and a Google Maps MCP
server for map-related tools.
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
from openai import AsyncOpenAI
from pydantic import BaseModel
from langchain_mcp_adapters.client import MultiServerMCPClient

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


def _mcp_server_configs() -> dict[str, dict[str, Any]]:
    mcp_server_urls = _mcp_server_urls()
    mcp_api_key = os.environ.get("AGENT_MCP_1_API_KEY", "").strip()

    if not mcp_server_urls or not mcp_api_key:
        return {}

    return {
        f"mcp_server_{i}": {
            "url": url,
            "transport": "streamable_http",
            "headers": {
                "X-Goog-Api-Key": mcp_api_key,
            },
        }
        for i, url in enumerate(mcp_server_urls)
    }


def _schema_from_tool(tool: Any) -> dict[str, Any]:
    schema = getattr(tool, "tool_call_schema", None) or getattr(tool, "args_schema", None) or getattr(tool, "input_schema", None)
    if isinstance(schema, dict):
        return schema
    if schema is not None and hasattr(schema, "model_json_schema"):
        return schema.model_json_schema()
    if schema is not None and hasattr(schema, "schema"):
        return schema.schema()
    return {"type": "object", "properties": {}}


def _tool_definitions(tools: list[Any]) -> list[dict[str, Any]]:
    definitions: list[dict[str, Any]] = []
    for tool in tools:
        tool_name = getattr(tool, "name", "unknown")
        description = getattr(tool, "description", None)
        input_schema = _schema_from_tool(tool)
        definitions.append(
            {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": description or f"MCP tool {tool_name}",
                    "parameters": input_schema,
                },
            }
        )
    return definitions


def _stringify_tool_result(result: Any) -> str:
    if hasattr(result, "model_dump"):
        return json.dumps(result.model_dump(mode="json", exclude_none=True), ensure_ascii=False)
    return json.dumps(result, ensure_ascii=False, default=str)


async def _run_chat_loop(message: str) -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY environment variable is not set.",
        )

    openai_client = AsyncOpenAI(api_key=api_key)

    server_configs = _mcp_server_configs()
    if not server_configs:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AGENT_MCP_1_URL and AGENT_MCP_1_API_KEY environment variables must be set.",
        )

    system_prompt = (
        "You are a Google Maps assistant. Use the available MCP tools for "
        "places, weather, routes, and related map lookups. Do not invent map "
        "data. If required fields are missing for a tool call, ask a concise "
        "follow-up question."
    )

    mcp_client = MultiServerMCPClient(server_configs)
    tools = await mcp_client.get_tools()
    tool_definitions = _tool_definitions(list(tools))
    tool_lookup = {tool.name: tool for tool in tools}

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message},
    ]

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
                arguments_text = tool_call.function.arguments or "{}"
                try:
                    arguments = json.loads(arguments_text)
                except json.JSONDecodeError:
                    arguments = {"_raw_arguments": arguments_text}

                logger.info(
                    "OpenAI requested tool %s with %s",
                    tool_call.function.name,
                    arguments,
                )
                tool = tool_lookup.get(tool_call.function.name)
                if tool is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Unknown MCP tool requested: {tool_call.function.name}",
                    )

                if hasattr(tool, "ainvoke"):
                    tool_result = await tool.ainvoke(arguments)
                else:
                    tool_result = tool.invoke(arguments)

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": _stringify_tool_result(tool_result),
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
