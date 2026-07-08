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

async def verify_jwt(token: str = Depends(oauth2_scheme)):
    """
    Verify the JWT token provided in the Authorization header.
    In a real-world scenario, you would use a public key or secret to verify the signature.
    Since this is a simple agent for the Agent Manager platform, we'll extract claims and
    ensure it's a validly formatted JWT. The platform will typically sign it.
    """
    try:
        # Decode without verifying signature for this simple example, 
        # but in production you'd use the platform's JWKS or shared secret.
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except jwt.PyJWTError:
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
