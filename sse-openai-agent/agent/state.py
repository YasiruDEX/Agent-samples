from typing import Annotated

from typing_extensions import TypedDict
from langgraph.graph.message import AnyMessage, add_messages


class State(TypedDict):
    """
    The state of the ShopFlow customer support agent.
    messages: the full conversation history, with automatic appending via add_messages.
    """
    messages: Annotated[list[AnyMessage], add_messages]
