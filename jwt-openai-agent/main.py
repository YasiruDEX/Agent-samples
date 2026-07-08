import os
import uvicorn
import jwt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from openai import AsyncOpenAI

import traceback
from fastapi.responses import JSONResponse

app = FastAPI(title="JWT OpenAI Chatbot Agent")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal Server Error",
            "detail": str(exc),
            "traceback": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        }
    )

# OAuth2 scheme for extracting the Bearer token from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    response: str

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback_local_secret_key")
JWT_ALGORITHM = "HS256"

async def verify_jwt(token: str = Depends(oauth2_scheme)):
    """
    Verify the JWT token provided in the Authorization header.
    Validates the cryptographic signature and checks for expiration.
    """
    try:
        decoded_payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return decoded_payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
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
    uvicorn.run(app, host="0.0.0.0", port=9099)
