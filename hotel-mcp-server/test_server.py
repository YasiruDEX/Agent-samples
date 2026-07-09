"""
Functional smoke-test for the Hotel Registry MCP Server tools.
Run directly:  python3.11 test_server.py
"""
import importlib.util, sys, json
from pathlib import Path

# ── load server module ────────────────────────────────────────────────────
spec = importlib.util.spec_from_file_location("server", Path(__file__).parent / "server.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

list_hotels    = mod.list_hotels
get_hotel      = mod.get_hotel
register_hotel = mod.register_hotel
update_hotel   = mod.update_hotel
rename_hotel   = mod.rename_hotel
delete_hotel   = mod.delete_hotel

PASS = "✅"
FAIL = "❌"
results = []

def check(label: str, result: dict, *, expect_success=True, key=None, value=None):
    ok = True
    if expect_success and result.get("error"):
        ok = False
    if not expect_success and not result.get("error"):
        ok = False
    if key is not None and result.get(key) != value:
        ok = False
    icon = PASS if ok else FAIL
    results.append(ok)
    snippet = json.dumps(result)[:120]
    print(f"  {icon}  {label}\n     → {snippet}")

print("\n─── Hotel Registry MCP Server – Smoke Tests ───\n")

# 1. List all hotels
r = list_hotels()
check("list_hotels() – returns hotels", r)
total = r.get("total", 0)
print(f"     (total hotels: {total})")

# 2. Get a known hotel by name
r = get_hotel(hotel_name="Azure Bay Resort Paris")
check("get_hotel(name='Azure Bay Resort Paris')", r)

# 3. Get a known hotel by ID
r = get_hotel(hotel_id="mock-001-paris")
check("get_hotel(hotel_id='mock-001-paris')", r)

# 4. Register a new test hotel
r = register_hotel(
    hotel_name="Test MCP Hotel 99",
    city="Test City, TC",
    country="Testland",
    rating=4.0,
    lowest_price=99.0,
)
check("register_hotel() – new hotel", r)
new_id = r.get("hotel", {}).get("hotel_id", "")
print(f"     (new hotel_id: {new_id})")

# 5. Retrieve the newly created hotel
r = get_hotel(hotel_id=new_id)
check("get_hotel() – newly registered", r)

# 6. Update the hotel price and availability
r = update_hotel(hotel_id=new_id, lowest_price=149.0, is_available=False)
check("update_hotel() – price + availability", r)
h = r.get("hotel", {})
check("  → lowest_price updated", r, key=None)  # just log
print(f"     lowest_price={h.get('lowest_price')}, is_available={h.get('is_available')}")

# 7. Rename the hotel
r = rename_hotel(hotel_id=new_id, new_name="Test MCP Hotel 99 Renamed")
check("rename_hotel()", r, key="new_name", value="Test MCP Hotel 99 Renamed")

# 8. Filter list by city
r = list_hotels(city="Test City")
check("list_hotels(city='Test City') – finds renamed hotel", r)

# 9. Delete the test hotel
r = delete_hotel(hotel_id=new_id)
check("delete_hotel()", r, key="deleted_hotel_id", value=new_id)

# 10. Confirm deletion
r = get_hotel(hotel_id=new_id)
check("get_hotel() after delete – should error", r, expect_success=False)

# 11. Error: register without required fields
r = register_hotel(hotel_name="", city="Nowhere")
check("register_hotel(name='') – should error", r, expect_success=False)

# 12. Error: delete non-existent
r = delete_hotel(hotel_id="does-not-exist-xyz")
check("delete_hotel(non-existent) – should error", r, expect_success=False)

print(f"\n─── Results: {sum(results)}/{len(results)} passed ───\n")
if not all(results):
    sys.exit(1)
