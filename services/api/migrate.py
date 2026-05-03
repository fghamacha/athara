import asyncio
import asyncpg
import os

async def run():
    conn = await asyncpg.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", 5432)),
        database=os.getenv("POSTGRES_DB", "athara"),
        user=os.getenv("POSTGRES_USER", "athara"),
        password=os.getenv("POSTGRES_PASSWORD", "athara"),
    )
    with open("/app/migrations/001_initial.sql") as f:
        await conn.execute(f.read())
    await conn.close()
    print("✅ Migration 001_initial.sql applied")

if __name__ == "__main__":
    asyncio.run(run())
