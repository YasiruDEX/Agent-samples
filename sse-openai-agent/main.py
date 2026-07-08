import os
import uvicorn
import json
from fastapi import FastAPI, HTTPException, status, Request
from pydantic import BaseModel
from openai import AsyncOpenAI
from sse_starlette.sse import EventSourceResponse
import traceback
from fastapi.responses import JSONResponse

app = FastAPI(title="SSE OpenAI Chatbot Agent")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal Server Error",
            "detail": str(exc),
            "traceback": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        }
    )

class ChatRequest(BaseModel):
    session_id: str
    message: str

@app.post("/chat")
async def chat(request: Request, chat_request: ChatRequest):
    """
    Chat endpoint that supports SSE streaming.
    Uses OpenAI to generate a streaming response.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY environment variable is not set."
        )

    client = AsyncOpenAI(api_key=api_key)

    async def event_generator():
        try:
            stream = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful and friendly chatbot assistant."},
                    {"role": "user", "content": chat_request.message}
                ],
                stream=True
            )
            
            async for chunk in stream:
                if await request.is_disconnected():
                    break
                
                if chunk.choices[0].delta.content is not None:
                    yield {
                        "event": "message",
                        "data": json.dumps({"content": chunk.choices[0].delta.content})
                    }
                    
            yield {
                "event": "done",
                "data": "[DONE]"
            }
                
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }

    return EventSourceResponse(event_generator())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9099)
