import asyncio
import os
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from dotenv import load_dotenv

load_dotenv()

async def list_tools():
    mcp_url = os.environ.get("AGENT_MCP_1_URL")
    mcp_key = os.environ.get("AGENT_MCP_1_API_KEY")
    headers = {"X-Goog-Api-Key": mcp_key}
    
    print(f"Connecting to MCP at {mcp_url}")
    async with streamablehttp_client(mcp_url, headers=headers) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            response = await session.list_tools()
            for tool in response.tools:
                print(f"Tool: {tool.name} - {tool.description}")

if __name__ == "__main__":
    asyncio.run(list_tools())
