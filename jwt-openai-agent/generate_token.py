import jwt
import datetime

# Must match the variables in your FastAPI app exactly
SECRET_KEY = "fallback_local_secret_key"
ALGORITHM = "HS256"

# Create a sample payload
payload = {
    "sub": "test_user_123",  # Subject (usually user ID)
    "role": "admin",         # Any custom data you want
    # Token expires in 1 hour
    "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
}

# Generate the signed JWT
encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

print("\n--- YOUR BEARER TOKEN ---")
print(encoded_jwt)
print("-------------------------\n")