import os
from fastapi.testclient import TestClient
from app import app
from dotenv import load_dotenv

load_dotenv()

client = TestClient(app)

def run_tests():
    print("Testing basic greeting...")
    response = client.post(
        "/chat",
        json={
            "session_id": "test-session-123",
            "messages": [
                {"role": "user", "content": "Hi there!"}
            ]
        }
    )
    print("Greeting Status:", response.status_code)
    print("Greeting Response:", response.json())

    print("\nTesting full risk report (this will invoke maps and weather)...")
    response = client.post(
        "/chat",
        json={
            "session_id": "test-session-124",
            "messages": [
                {"role": "user", "content": "Assess Pelican Hill Resort for October 14, 2026"}
            ]
        }
    )
    print("Report Status:", response.status_code)
    if response.status_code == 200:
        print("Report Response:", response.json())
    else:
        print("Error Response:", response.text)

if __name__ == "__main__":
    run_tests()
