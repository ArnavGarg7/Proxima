import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from proxima.database import AsyncSessionLocal
from proxima.models.core import User

async def check_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"User: {u.user_id}, {u.email}")

if __name__ == "__main__":
    asyncio.run(check_users())
