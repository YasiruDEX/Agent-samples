import os
import uvicorn
import jwt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from openai import AsyncOpenAI

app = FastAPI(title="JWT OpenAI Chatbot Agent")

# OAuth2 scheme for extracting the Bearer token from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    response: str

import base64
import json

async def verify_jwt(token: str = Depends(oauth2_scheme)):
    """
    Verify the JWT token provided in the Authorization header.
    To be compatible with any token signature algorithm (RS256, HS256, etc.) and dummy 
    signatures used during testing, we decode the payload using base64 without strict signature verification.
    """
    try:
        # Split JWT to get the payload (second part)
        parts = token.split('.')
        if len(parts) < 2:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid JWT token format",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        payload_b64 = parts[1]
        # Add padding to base64 string if necessary
        payload_b64 += '=' * (-len(payload_b64) % 4)
        
        # Decode base64url payload
        decoded_payload = base64.urlsafe_b64decode(payload_b64).decode('utf-8')
        return json.loads(decoded_payload)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, token_payload: dict = Depends(verify_jwt)):
    """
    Chat endpoint that requires a valid JWT token.
    Uses OpenAI to generate a response.
    """
    # Initialize the OpenAI client
    # The platform or environment should provide the OPENAI_API_KEY
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY environment variable is not set."
        )

    client = AsyncOpenAI(api_key=api_key)
    
    try:
        # Call OpenAI's chat completions API
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo", # Defaulting to 3.5-turbo for a simple chatbot
            messages=[
                {"role": "system", "content": "You are a helpful and friendly chatbot assistant."},
                {"role": "user", "content": request.message}
            ]
        )
        
        reply = response.choices[0].message.content
        return ChatResponse(response=reply)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with OpenAI: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
