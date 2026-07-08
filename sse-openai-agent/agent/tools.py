"""
tools.py – Custom LangChain tools for the ShopFlow customer support agent.

Tools:
  - track_order: Returns shipping status for a given order ID (mocked).
  - process_refund: Initiates a refund for a given order ID and reason (mocked).
"""

import json
from langchain_core.tools import tool


# ---------------------------------------------------------------------------
# Mock data store
# ---------------------------------------------------------------------------

# Orders whose IDs start with "123" are treated as existing shipped orders.
# An expanded mock DB maps specific IDs to richer states for demo purposes.
_ORDER_DB: dict[str, dict] = {
    "12300": {"status": "Shipped",   "eta": "2 days",  "item": "Wireless Headphones"},
    "12301": {"status": "Delivered", "eta": None,      "item": "Running Shoes"},
    "12302": {"status": "Delayed",   "eta": "5 days",  "item": "Coffee Maker"},
    "12303": {"status": "Shipped",   "eta": "3 days",  "item": "Laptop Stand"},
}

_REFUNDABLE_STATUSES = {"Delivered", "Delayed"}


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@tool
async def track_order(order_id: str) -> str:
    """
    Track the shipping status of an order.

    Args:
        order_id: The unique identifier for the customer's order.

    Returns:
        A JSON string with keys: status, eta (optional), item (optional).
        If order is not found, returns a Not Found status.
    """
    # Check explicit mock entries first
    if order_id in _ORDER_DB:
        result = _ORDER_DB[order_id]
    elif order_id.startswith("123"):
        # Default for any other "123*" order
        result = {"status": "Shipped", "eta": "2 days", "item": "Unknown Item"}
    else:
        result = {"status": "Not Found"}

    return json.dumps(result)


@tool
async def process_refund(order_id: str, reason: str) -> str:
    """
    Process a refund request for an order.

    Refunds are only approved for orders with status "Delivered" or "Delayed".
    The reason for the refund must always be provided.

    Args:
        order_id: The unique identifier for the customer's order.
        reason: The customer's stated reason for requesting a refund.

    Returns:
        A JSON string indicating whether the refund was approved or rejected,
        along with a descriptive message.
    """
    if not reason or not reason.strip():
        return json.dumps({
            "approved": False,
            "message": "Refund request rejected: a reason must be provided."
        })

    # Retrieve order status
    if order_id in _ORDER_DB:
        order_info = _ORDER_DB[order_id]
    elif order_id.startswith("123"):
        order_info = {"status": "Shipped", "eta": "2 days", "item": "Unknown Item"}
    else:
        order_info = {"status": "Not Found"}

    status = order_info.get("status", "Not Found")

    if status == "Not Found":
        return json.dumps({
            "approved": False,
            "message": f"Refund request rejected: order '{order_id}' was not found in our system."
        })

    if status in _REFUNDABLE_STATUSES:
        return json.dumps({
            "approved": True,
            "message": (
                f"Refund for order '{order_id}' has been successfully initiated. "
                f"Reason recorded: '{reason}'. "
                "You will receive a confirmation email within 24 hours, "
                "and the amount will be credited within 5–7 business days."
            )
        })

    return json.dumps({
        "approved": False,
        "message": (
            f"Refund request rejected: order '{order_id}' has status '{status}', "
            "which is not eligible for a refund. "
            "Refunds are only available for orders that have been Delivered or are Delayed."
        )
    })
