"""
graph.py – LangGraph StateGraph for the ShopFlow customer support agent.

Architecture:
  START → assistant → (tools_condition) → tools → assistant → …

The graph is compiled once at module load time (singleton) and shared across
all requests. Session isolation is achieved via LangGraph's InMemorySaver
checkpointer keyed on `thread_id` (= session_id from the API request).
"""

import logging
from langchain_core.messages import SystemMessage
from langchain_core.runnables import Runnable, RunnableConfig
from langchain_core.messages import ToolMessage
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import StateGraph, START
from langgraph.prebuilt import ToolNode, tools_condition

from .state import State
from .tools import track_order, process_refund
from .prompts import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tool list
# ---------------------------------------------------------------------------

TOOLS = [track_order, process_refund]


# ---------------------------------------------------------------------------
# Tool node with error fallback (mirrors customer-support-agent pattern)
# ---------------------------------------------------------------------------

def _handle_tool_error(state: State) -> dict:
    """Return a ToolMessage describing the error so the LLM can recover."""
    error = state.get("error")
    tool_calls = state["messages"][-1].tool_calls
    return {
        "messages": [
            ToolMessage(
                content=f"Tool execution error: {repr(error)}. Please try again or inform the user.",
                tool_call_id=tc["id"],
            )
            for tc in tool_calls
        ]
    }


def _create_tool_node_with_fallback(tools: list) -> ToolNode:
    return ToolNode(tools).with_fallbacks(
        [RunnableLambda(_handle_tool_error)], exception_key="error"
    )


# ---------------------------------------------------------------------------
# Assistant node
# ---------------------------------------------------------------------------

class Assistant:
    """
    Wraps the LLM runnable and re-prompts if the model returns an empty response.
    Injects the system prompt at the head of each invocation.
    """

    def __init__(self, runnable: Runnable):
        self.runnable = runnable

    def __call__(self, state: State, config: RunnableConfig) -> dict:
        # Prepend system message to the messages list
        messages_with_system = [SystemMessage(content=SYSTEM_PROMPT)] + list(state["messages"])

        while True:
            result = self.runnable.invoke(
                {"messages": messages_with_system}, config
            )
            # Re-prompt if the LLM returns an empty response
            if not result.tool_calls and (
                not result.content
                or (isinstance(result.content, list) and not result.content[0].get("text"))
            ):
                messages_with_system = messages_with_system + [
                    ("user", "Respond with a real output.")
                ]
            else:
                break

        return {"messages": result}


# ---------------------------------------------------------------------------
# Graph compilation (module-level singleton)
# ---------------------------------------------------------------------------

def build_graph():
    """
    Compile and return the LangGraph agent graph.

    The graph is stateful per thread_id via InMemorySaver checkpointing.
    streaming=True on ChatOpenAI enables token-level streaming via astream_events.
    """
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, streaming=True)
    runnable = llm.bind_tools(TOOLS)

    builder = StateGraph(State)
    builder.add_node("assistant", Assistant(runnable))
    builder.add_node("tools", _create_tool_node_with_fallback(TOOLS))

    builder.add_edge(START, "assistant")
    builder.add_conditional_edges("assistant", tools_condition)
    builder.add_edge("tools", "assistant")

    memory = InMemorySaver()
    graph = builder.compile(checkpointer=memory)
    logger.info("ShopFlow LangGraph agent compiled successfully.")
    return graph


# Singleton — imported by main.py
graph = build_graph()
