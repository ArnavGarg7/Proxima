import httpx
import asyncio
import json

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Get documents (might need auth? If auth is required, I need a token.
        # Let's check if the endpoint is protected)
        try:
            # Let's just create a test document in the DB and analyze it directly 
            # via python script, but using the exact text from the DB!
            pass
        except Exception as e:
            print(e)

if __name__ == "__main__":
    asyncio.run(main())
