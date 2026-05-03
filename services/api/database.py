import asyncpg
import os
from typing import Optional

pool: Optional[asyncpg.Pool] = None


async def create_pool():
    global pool
    pool = await asyncpg.create_pool(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", 5432)),
        database=os.getenv("POSTGRES_DB", "athara"),
        user=os.getenv("POSTGRES_USER", "athara"),
        password=os.getenv("POSTGRES_PASSWORD", "athara"),
        min_size=5,
        max_size=20,
    )


async def close_pool():
    global pool
    if pool:
        await pool.close()


async def get_pool() -> asyncpg.Pool:
    return pool
