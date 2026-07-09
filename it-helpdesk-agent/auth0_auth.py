import json
import requests

# --- CONFIGURATION VARIABLES ---
AUTH0_URL = "https://dev-3jsz6osuavya5i0e.us.auth0.com/oauth/token"
GATEWAY_URL = "http://default-default.am-gateway.localhost:19080/it-helpdesk-agent-it-helpdesk-agent-endpoint/chat"

# Auth0 Payload credentials
AUTH_PAYLOAD = {
    "client_id": "w9oN4PSDadsbYlNw7SAeItjqNEyaZ4KL",
    "client_secret": "VqUlNhmkM7UN5BqDqapI2mLIgx4ZdVtwrS729v6_JhaSLeUjIaN5y_Uq7maXlPdl",
    "audience": "https://api.myproject.com",
    "grant_type": "client_credentials"
}

# Agent Request Payload
AGENT_PAYLOAD = {
    "message": "I need help with my password reset.",
    "session_id": "user-session-123",
    "context": {}
}


def get_auth0_token():
    """Fetches the OAuth access token from Auth0."""
    print("Fetching token from Auth0...")
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(AUTH0_URL, json=AUTH_PAYLOAD, headers=headers)
    
    if response.status_code == 200:
        token_data = response.json()
        print("Successfully retrieved Auth0 token.")
        return token_data.get("access_token")
    else:
        print(f"Failed to get token. Status code: {response.status_code}")
        print(response.text)
        return None


def call_agent_api(token):
    """Calls the Agent Endpoint using the fetched token."""
    print("\nSending request to Agent Gateway...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(GATEWAY_URL, json=AGENT_PAYLOAD, headers=headers)
    
    print(f"Gateway Response Status: {response.status_code}")
    try:
        # Pretty print the json output from your agent backend
        print("Response Content:")
        print(json.dumps(response.json(), indent=2))
    except json.JSONDecodeError:
        print(response.text)


if __name__ == "__main__":
    # 1. Grab the token
    access_token = get_auth0_token()
    
    # 2. If token grab was successful, hit the gateway endpoint
    if access_token:
        call_agent_api(access_token)