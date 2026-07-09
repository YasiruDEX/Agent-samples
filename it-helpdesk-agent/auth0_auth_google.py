import base64
import hashlib
import json
import os
import secrets
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlparse
import requests

# --- CONFIGURATION ---
AUTH0_DOMAIN = "dev-3jsz6osuavya5i0e.us.auth0.com"
CLIENT_ID = "BA2lHqW95cMKciEN0afWXM8vLXvW7lg0"  # Your Native Client ID
AUDIENCE = "https://api.myproject.com"
GATEWAY_URL = "http://default-default.am-gateway.localhost:19080/it-helpdesk-agent-it-helpdesk-agent-endpoint/chat"
PORT = 8089
REDIRECT_URI = f"http://127.0.0.1:{PORT}/callback"

# Global flags to safely control the listening loop
authorization_code = None
login_error_message = None

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global authorization_code, login_error_message
        
        # Parse the incoming URL path and queries
        parsed_url = urlparse(self.path)
        query = parse_qs(parsed_url.query)
        
        # Only process requests meant for our explicit callback path
        if parsed_url.path == "/callback":
            if "code" in query:
                authorization_code = query["code"][0]
                self.send_response(200)
                self.send_header("Content-type", "text/html")
                self.end_headers()
                self.wfile.write(b"<h1>Login Successful!</h1><p>You can close this tab and return to your terminal.</p>")
            elif "error_description" in query:
                login_error_message = query["error_description"][0]
                self.send_response(400)
                self.send_header("Content-type", "text/html")
                self.end_headers()
                self.wfile.write(f"<h1>Login Failed</h1><p>{login_error_message}</p>".encode('utf-8'))
        else:
            # Drop random background noise (like favicon.ico) with a 404 so the server keeps waiting
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        return # Suppress default log clutter in your terminal

def generate_pkce():
    verifier = secrets.token_urlsafe(32)
    sha256_hash = hashlib.sha256(verifier.encode('utf-8')).digest()
    challenge = base64.urlsafe_b64encode(sha256_hash).decode('utf-8').replace('=', '')
    return verifier, challenge

def get_user_jwt():
    global authorization_code, login_error_message
    verifier, challenge = generate_pkce()
    
    # 1. Build browser login URL
    params = {
        "audience": AUDIENCE,
        "scope": "openid profile email",
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "code_challenge": challenge,
        "code_challenge_method": "S256"
    }
    auth_url = f"https://{AUTH0_DOMAIN}/authorize?{urlencode(params)}"
    
    # 2. Bind local network listener
    try:
        server = HTTPServer(("", PORT), CallbackHandler)
    except Exception as e:
        print(f"Could not bind to port {PORT}. Error: {e}")
        return None

    print("\n-------------------------------------------------------------")
    print("If your browser doesn't open automatically, copy & paste this link:")
    print(auth_url)
    print("-------------------------------------------------------------\n")
    
    webbrowser.open(auth_url)
    
    # 3. Robust Loop: Keep listening until an explicit code or login error drops in
    print("Waiting for you to log in via your browser...")
    while authorization_code is None and login_error_message is None:
        server.handle_request() 
        
    server.server_close()
    
    if login_error_message:
        raise Exception(f"Auth0 Login Error: {login_error_message}")
        
    if not authorization_code:
        raise Exception("Failed to acquire authorization code from browser flow.")
        
    # 4. Exchange code for token
    print("Exchanging code for JWT access token...")
    token_url = f"https://{AUTH0_DOMAIN}/oauth/token"
    token_payload = {
        "grant_type": "authorization_code",
        "client_id": CLIENT_ID,
        "code_verifier": verifier,
        "code": authorization_code,
        "redirect_uri": REDIRECT_URI
    }
    
    res = requests.post(token_url, json=token_payload)
    if res.status_code == 200:
        return res.json().get("access_token")
    else:
        print("Token exchange error:", res.text)
        return None

def call_agent(token):
    print("\nSending authorized user request to Agent Gateway...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    agent_payload = {
        "message": "Hello agent! I am logged in securely with Google.",
        "session_id": "user-session-999",
        "context": {}
    }
    response = requests.post(GATEWAY_URL, json=agent_payload, headers=headers)
    print(f"Gateway Response Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    jwt_token = get_user_jwt()
    if jwt_token:
        print("Received valid User JWT.")
        call_agent(jwt_token)