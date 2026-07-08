"""
main.py – FastAPI SSE entrypoint for the ShopFlow customer support agent.

SSE Event Protocol
------------------
event: message       data: {"content": "<token>"}
event: tool_use      data: {"tool": "<name>", "input": {...}}
event: tool_result   data: {"tool": "<name>", "output": "<result>"}
event: human_handoff data: {"reason": "User requested human agent"}
event: error         data: {"error": "<message>"}
event: done          data: "[DONE]"
"""

import json
import logging
import os
import traceback

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from agent.graph import graph

load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ShopFlow SSE Customer Support Agent",
    description=(
        "Production-ready LangGraph + OpenAI agent with SSE streaming, "
        "tool calling, per-session memory, and business guardrails."
    ),
    version="2.0.0",
)

# Human handoff sentinel emitted by the LLM when guardrail Rule 4 is triggered
_HANDOFF_SENTINEL = "##HUMAN_HANDOFF##"


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
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
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    session_id: str
    message: str


# ---------------------------------------------------------------------------
# SSE chat endpoint
# ---------------------------------------------------------------------------

@app.post("/chat", summary="Chat with the ShopFlow support agent via SSE streaming")
async def chat(request: Request, chat_request: ChatRequest):
    """
    Accept a user message and stream the agent's response using Server-Sent Events.

    Each SSE event has a typed `event` field so clients can route them appropriately:
      - message:       incremental AI text token
      - tool_use:      a tool is being invoked (name + input payload)
      - tool_result:   result returned from a tool
      - human_handoff: agent detected frustration / supervisor request
      - error:         an error occurred (does not terminate the SSE connection)
      - done:          stream is complete
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY environment variable is not set.",
        )

    # LangGraph config – thread_id scopes the InMemorySaver checkpoint to this session
    run_config = {
        "configurable": {
            "thread_id": chat_request.session_id,
        }
    }

    # User input formatted as a LangGraph messages update
    agent_input = {"messages": [("user", chat_request.message)]}

    async def event_generator():
        accumulated_content: list[str] = []

        try:
            async for event in graph.astream_events(
                agent_input, run_config, version="v2"
            ):
                # ── Disconnect guard ────────────────────────────────────────
                if await request.is_disconnected():
                    logger.info(
                        "Client disconnected for session=%s – terminating stream.",
                        chat_request.session_id,
                    )
                    break

                kind = event.get("event")
                name = event.get("name", "")

                # ── Token streaming from the LLM ────────────────────────────
                if kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if chunk and chunk.content:
                        token = chunk.content
                        accumulated_content.append(token)

                        # Detect human handoff sentinel (may arrive across chunks)
                        full_so_far = "".join(accumulated_content)
                        if _HANDOFF_SENTINEL in full_so_far:
                            yield {
                                "event": "human_handoff",
                                "data": json.dumps(
                                    {"reason": "User requested human agent or expressed frustration."}
                                ),
                            }
                            # Flush remaining buffer and stop streaming AI text
                            accumulated_content.clear()
                            break

                        yield {
                            "event": "message",
                            "data": json.dumps({"content": token}),
                        }

                # ── Tool invocation start ───────────────────────────────────
                elif kind == "on_tool_start":
                    tool_input = event["data"].get("input", {})
                    logger.info("Tool invoked: %s | input=%s", name, tool_input)
                    yield {
                        "event": "tool_use",
                        "data": json.dumps({"tool": name, "input": tool_input}),
                    }

                # ── Tool invocation end ─────────────────────────────────────
                elif kind == "on_tool_end":
                    tool_output = event["data"].get("output", "")
                    # output may be a ToolMessage object; coerce to string
                    if hasattr(tool_output, "content"):
                        tool_output = tool_output.content
                    logger.info("Tool result: %s | output=%s", name, tool_output)
                    yield {
                        "event": "tool_result",
                        "data": json.dumps({"tool": name, "output": tool_output}),
                    }

        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "Streaming error for session=%s: %s", chat_request.session_id, exc
            )
            yield {
                "event": "error",
                "data": json.dumps({"error": str(exc)}),
            }

        finally:
            yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(event_generator())


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", summary="Health check")
async def health():
    return {"status": "ok", "agent": "ShopFlow SSE Customer Support"}


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9099)
