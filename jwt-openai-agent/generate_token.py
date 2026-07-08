import jwt

# Generate a dummy token signed with a dummy secret.
# Since our agent currently has verify_signature=False, 
# any well-formed JWT will be accepted for local testing.
payload = {
    "sub": "test_user",
    "name": "Local Tester"
}

token = jwt.encode(payload, "dummy_secret_key", algorithm="HS256")
print(f"Your Bearer Token for local testing is:\n\n{token}\n")
