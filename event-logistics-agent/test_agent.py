import os
from fastapi.testclient import TestClient
from app import app
from dotenv import load_dotenv

load_dotenv()

client = TestClient(app)

def run_tests():
    print("Testing basic greeting (general_query fallback)...")
    response = client.post(
        "/chat",
        json={
            "session_id": "test-session-greeting",
            "messages": [
                {"role": "user", "content": "Hi there!"}
            ]
        }
    )
    print("Greeting Status:", response.status_code)
    print("Greeting Response:", response.json())

    print("\nTesting full risk report (risk_assessment)...")
    response = client.post(
        "/chat",
        json={
            "session_id": "test-session-report",
            "messages": [
                {"role": "user", "content": "Assess Pelican Hill Resort for October 14, 2026"}
            ]
        }
    )
    print("Report Status:", response.status_code)
    
    print("\nTesting dynamic routing: distance query (general_query)...")
    response = client.post(
        "/chat",
        json={
            "session_id": "test-session-report",
            "messages": [
                {"role": "user", "content": "distance from wso2, colombo 4 to fort railway station"}
            ]
        }
    )
    print("Distance Status:", response.status_code)
    print("Distance Response:", response.json())

    print("\nTesting dynamic routing: walk time (general_query)...")
    response = client.post(
        "/chat",
        json={
            "session_id": "test-session-report",
            "messages": [
                {"role": "user", "content": "time it takes to walk"}
            ]
        }
    )
    print("Walk Time Status:", response.status_code)
    print("Walk Time Response:", response.json())

if __name__ == "__main__":
    run_tests()
