import jwt
import time

# Use the same secret key that the server is using.
# If you didn't set JWT_SECRET_KEY when running the server, it uses this default:
SECRET_KEY = "fallback_local_secret_key"

payload = {
    "sub": "test_user_123",
    "role": "admin",
    "exp": int(time.time()) + 3600  # Expires in 1 hour
}

token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
print(f"Generated Secure Token:\n\n{token}\n")
