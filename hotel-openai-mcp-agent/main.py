"""
Hotel OpenAI MCP Agent
======================
A FastAPI chat agent that uses OpenAI for reasoning and the hotel registry
MCP server for hotel-related tools.
"""

from __future__ import annotations

import json
import logging
import os
import traceback
from contextlib import asynccontextmanager
from typing import Any

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from openai import AsyncOpenAI
from pydantic import BaseModel

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_MCP_URL = (
    "http://default-default.gateway.localhost:19080/default/hotel-registry/mcp"
)
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_TOOL_ROUNDS = int(os.getenv("MAX_TOOL_ROUNDS", "6"))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("hotel-openai-mcp-agent")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Hotel OpenAI MCP Agent",
    description=(
        "A chat agent that uses OpenAI and a remote hotel registry MCP server "
        "for hotel lookups and mutations."
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
    return os.getenv("HOTEL_MCP_URL", DEFAULT_MCP_URL)


def _mcp_headers() -> dict[str, str]:
    headers = {
        "Accept": os.getenv(
            "HOTEL_MCP_ACCEPT",
            "application/json, text/event-stream",
        ).strip()
        or "application/json, text/event-stream",
    }

    api_key = os.getenv("HOTEL_MCP_API_KEY", "").strip()
    if not api_key:
        return headers

    header_name = os.getenv("HOTEL_MCP_AUTH_HEADER", "x-api-key").strip() or "x-api-key"
    auth_prefix = os.getenv("HOTEL_MCP_AUTH_PREFIX", "").strip()

    if auth_prefix:
        headers[header_name] = f"{auth_prefix} {api_key}".strip()
    else:
        headers[header_name] = api_key
    return headers


def _extract_jsonrpc_message(body: str) -> dict[str, Any]:
    body = body.strip()
    if not body:
        raise ValueError("Empty MCP response body.")

    if body.startswith("{"):
        return json.loads(body)

    for block in body.split("\n\n"):
        data_lines: list[str] = []
        for line in block.splitlines():
            if line.startswith("data:"):
                data_lines.append(line[5:].lstrip())
        if data_lines:
            return json.loads("\n".join(data_lines))

    raise ValueError(f"Unable to parse MCP response body: {body[:200]}")


class HotelMCPClient:
    def __init__(self, url: str, headers: dict[str, str]) -> None:
        self._url = url
        self._headers = headers
        self._http_client = httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(30.0, connect=10.0), follow_redirects=True)
        self._session_id: str | None = None
        self.instructions: str | None = None
        self.server_info: dict[str, Any] | None = None
        self._request_id = 0

    async def __aenter__(self) -> "HotelMCPClient":
        await self._initialize()
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self._http_client.aclose()

    def _next_request_id(self) -> int:
        self._request_id += 1
        return self._request_id

    def _session_headers(self) -> dict[str, str]:
        headers = dict(self._headers)
        if self._session_id:
            headers["mcp-session-id"] = self._session_id
        return headers

    async def _post(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = await self._http_client.post(self._url, headers=self._session_headers(), json=payload)
        response.raise_for_status()
        body = (await response.aread()).decode(response.encoding or "utf-8", errors="replace")
        message = _extract_jsonrpc_message(body)
        if message.get("error"):
            raise RuntimeError(message["error"])
        return message

    async def _initialize(self) -> None:
        response = await self._http_client.post(
            self._url,
            headers=self._headers,
            json={
                "jsonrpc": "2.0",
                "id": self._next_request_id(),
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "hotel-openai-mcp-agent", "version": "1.0.0"},
                },
            },
        )
        response.raise_for_status()
        self._session_id = response.headers.get("mcp-session-id")
        body = (await response.aread()).decode(response.encoding or "utf-8", errors="replace")
        message = _extract_jsonrpc_message(body)
        result = message.get("result") or {}
        self.instructions = result.get("instructions")
        self.server_info = result.get("serverInfo")

    async def list_tools(self) -> dict[str, Any]:
        message = await self._post(
            {
                "jsonrpc": "2.0",
                "id": self._next_request_id(),
                "method": "tools/list",
                "params": {},
            }
        )
        return message.get("result") or {}

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        message = await self._post(
            {
                "jsonrpc": "2.0",
                "id": self._next_request_id(),
                "method": "tools/call",
                "params": {"name": name, "arguments": arguments},
            }
        )
        return message.get("result") or {}


@asynccontextmanager
async def hotel_mcp_client():
    client = HotelMCPClient(_mcp_url(), _mcp_headers())
    async with client as session:
        yield session


def _tool_definitions(tools: list[Any]) -> list[dict[str, Any]]:
    definitions: list[dict[str, Any]] = []
    for tool in tools:
        tool_name = tool.get("name", "unknown") if isinstance(tool, dict) else getattr(tool, "name", "unknown")
        description = tool.get("description") if isinstance(tool, dict) else getattr(tool, "description", None)
        input_schema = tool.get("inputSchema") if isinstance(tool, dict) else getattr(tool, "input_schema", None)
        definitions.append(
            {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": description or f"MCP tool {tool_name}",
                    "parameters": input_schema or {"type": "object", "properties": {}},
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

    async with hotel_mcp_client() as mcp_client:
        tools_result = await mcp_client.list_tools()
        tool_definitions = _tool_definitions(list(tools_result.get("tools") or []))
        server_instructions = mcp_client.instructions

        system_prompt = (
            "You are a hotel assistant. Use the available MCP tools for hotel "
            "search, lookup, registration, updates, renaming, and deletion. "
            "Do not invent hotel data. If required fields are missing for a tool call, "
            "ask a concise follow-up question."
        )
        if server_instructions:
            system_prompt = f"{system_prompt}\n\nMCP server instructions: {server_instructions}"

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
                                "id": tool_call.id,
                                "type": "function",
                                "function": {
                                    "name": tool_call.function.name,
                                    "arguments": tool_call.function.arguments,
                                },
                            }
                            for tool_call in assistant_message.tool_calls
                        ],
                    }
                )

                for tool_call in assistant_message.tool_calls:
                    arguments_text = tool_call.function.arguments or "{}"
                    try:
                        arguments = json.loads(arguments_text)
                    except json.JSONDecodeError:
                        arguments = {"_raw_arguments": arguments_text}

                    logger.info("OpenAI requested tool %s with %s", tool_call.function.name, arguments)
                    tool_result = await mcp_client.call_tool(tool_call.function.name, arguments)
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


@app.post("/chat", response_model=ChatResponse, summary="Chat with the hotel agent")
async def chat(chat_request: ChatRequest):
    response = await _run_chat_loop(chat_request.message)
    return ChatResponse(response=response)


@app.get("/health", summary="Health check")
async def health():
    return {
        "status": "ok",
        "agent": "Hotel OpenAI MCP Agent",
        "mcp_url": _mcp_url(),
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9099)
