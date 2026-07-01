import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Ensure python path
sys.path.append(r"d:\Projects\Proxima\backend")

from proxima.services.general_document_analyzer import GeneralDocumentAnalyzer

async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres:password@127.0.0.1:5432/proxima")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        res = await GeneralDocumentAnalyzer.analyze(
            db, 
            full_text="This is a confidential document regarding Project X. It contains secret financial numbers.", 
            metadata={"title": "Test doc"}
        )
        print(res)

if __name__ == "__main__":
    asyncio.run(main())
