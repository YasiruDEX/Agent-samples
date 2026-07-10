"""
app.py
------
FastAPI application for the Google Maps Agent + Outdoor Event Logistics Pipeline.

Endpoints:
  POST /chat     – Original OpenAI + Google Maps MCP general-purpose assistant
  POST /analyze  – LangGraph multi-agent Outdoor Event Logistics risk pipeline
  GET  /health   – Health / configuration check
"""

from __future__ import annotations

import json
import logging
import os
import traceback
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from langchain_core.messages import HumanMessage
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from openai import AsyncOpenAI
from pydantic import BaseModel

from agent import build_graph
from agent.config import settings

load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("event-logistics-agent")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Event Logistics Agent",
    description=(
        "Exposes a LangGraph multi-agent pipeline for outdoor event & wedding logistics "
        "risk assessment, integrating Google Maps MCP and weather services."
    ),
    version="2.0.0",
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


class ChatMessageInput(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    session_id: str
    messages: list[ChatMessageInput]


class ChatResponse(BaseModel):
    response: str


class AnalyzeRequest(BaseModel):
    """
    Free-form user query for the Event Logistics pipeline.

    Example:
        {"query": "Assess 'Pelican Hill Resort, Newport Beach' for October 14, 2026"}
    """
    query: str


class AnalyzeResponse(BaseModel):
    risk_analysis: str
    venue_address: str
    event_date: str
    resolved_lat: float | None
    resolved_lon: float | None
    maps_data: dict
    weather_data: dict
    full_report: str


# ---------------------------------------------------------------------------
# MCP helpers (used by /chat only)
# ---------------------------------------------------------------------------


def _tool_definitions_from_mcp(tools: list[Any]) -> list[dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description or f"MCP tool {t.name}",
                "parameters": t.inputSchema if isinstance(t.inputSchema, dict) else {},
            },
        }
        for t in tools
    ]


def _stringify_mcp_result(result: Any) -> str:
    content = getattr(result, "content", None)
    if content is None:
        return str(result)
    parts: list[str] = []
    for item in content:
        if hasattr(item, "text"):
            parts.append(item.text)
        elif hasattr(item, "model_dump"):
            parts.append(
                json.dumps(
                    item.model_dump(mode="json", exclude_none=True), ensure_ascii=False
                )
            )
        else:
            parts.append(str(item))
    return "\n".join(parts) if parts else ""


# ---------------------------------------------------------------------------
# /chat core loop
# ---------------------------------------------------------------------------


async def _run_chat_loop(request: ChatRequest) -> str:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY is not set.",
        )
    if not settings.agent_mcp_1_url or not settings.agent_mcp_1_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AGENT_MCP_1_URL and AGENT_MCP_1_API_KEY must be set.",
        )

    openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    mcp_headers = {"X-Goog-Api-Key": settings.agent_mcp_1_api_key}

    system_prompt = (
        "You are a Google Maps assistant. Use the available MCP tools for "
        "places, weather, routes, and related map lookups. Do not invent map "
        "data. If required fields are missing, ask a concise follow-up question."
    )

    messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    
    for m in request.messages:
        messages.append({"role": m.role, "content": m.content})

    async with streamablehttp_client(
        settings.agent_mcp_1_url, headers=mcp_headers
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            list_result = await session.list_tools()
            mcp_tools = list_result.tools
            tool_definitions = _tool_definitions_from_mcp(mcp_tools)
            tool_names = {t.name for t in mcp_tools}

            logger.info("Loaded %d MCP tools.", len(mcp_tools))

            for _ in range(settings.max_tool_rounds):
                completion = await openai_client.chat.completions.create(
                    model=settings.openai_model,
                    messages=messages,
                    tools=tool_definitions,
                    tool_choice="auto",
                )
                assistant_message = completion.choices[0].message

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
                        try:
                            args = json.loads(tool_call.function.arguments or "{}")
                        except json.JSONDecodeError:
                            args = {}

                        if tool_name not in tool_names:
                            raise HTTPException(
                                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail=f"Unknown MCP tool requested: {tool_name}",
                            )

                        logger.info("Calling MCP tool '%s' args=%s", tool_name, args)
                        tool_result = await session.call_tool(tool_name, args)
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
        detail="Agent reached the maximum number of tool rounds without a final answer.",
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.post("/chat", response_model=ChatResponse, summary="Chat with the Google Maps MCP agent")
async def chat(request: ChatRequest):
    """
    General-purpose Google Maps assistant backed by OpenAI + MCP tools.
    Use for directions, place searches, route planning, and general map queries.
    """
    response = await _run_chat_loop(request)
    return ChatResponse(response=response)


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Outdoor Event Logistics Risk Assessment (LangGraph Pipeline)",
)
async def analyze(request: AnalyzeRequest):
    """
    Runs the full 4-node LangGraph pipeline:
    - **supervisor_router** – extracts venue + date from the query
    - **maps_node** – geocodes venue, finds hotels / parking / accessibility via Google Maps MCP
    - **weather_node** – fetches OpenWeather 4.0 timeline data natively (no MCP)
    - **risk_analyzer_node** – synthesises everything into a detailed risk report

    Example query: *"Assess 'Pelican Hill Resort, Newport Beach' for October 14, 2026"*
    """
    if not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must not be empty.",
        )

    graph = build_graph()
    try:
        final_state = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=request.query)],
                "venue_address": "",
                "event_date": "",
                "resolved_lat": None,
                "resolved_lon": None,
                "maps_data": {},
                "weather_data": {},
                "risk_analysis": "",
            }
        )
    except Exception as exc:
        logger.exception("Pipeline error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline execution failed: {exc}",
        )

    # Pull last AI message as the formatted full report
    messages = final_state.get("messages", [])
    full_report = next(
        (m.content for m in reversed(messages) if hasattr(m, "content") and m.content),
        "",
    )

    return AnalyzeResponse(
        risk_analysis=final_state.get("risk_analysis", ""),
        venue_address=final_state.get("venue_address", ""),
        event_date=final_state.get("event_date", ""),
        resolved_lat=final_state.get("resolved_lat"),
        resolved_lon=final_state.get("resolved_lon"),
        maps_data=final_state.get("maps_data", {}),
        weather_data=final_state.get("weather_data", {}),
        full_report=full_report,
    )


@app.get("/health", summary="Health check")
async def health():
    return {
        "status": "ok",
        "agent": "Google Maps Agent + Event Logistics Pipeline",
        "version": "2.0.0",
        "mcp_url": settings.agent_mcp_1_url,
        "openweather_configured": bool(settings.openweather_api_key),
    }
