from fastapi import APIRouter, Depends
import asyncpg

from database import get_pool

router = APIRouter()


@router.get("/")
async def get_tree(pool: asyncpg.Pool = Depends(get_pool)):
    """Retourne tous les noeuds et liens pour la visualisation D3."""
    async with pool.acquire() as conn:
        persons = await conn.fetch(
            "SELECT id, first_name, last_name, birth_date, death_date, photo_url, gender, profession FROM persons"
        )
        parent_child = await conn.fetch("SELECT id, parent_id, child_id, relationship_type FROM parent_child")
        marriages = await conn.fetch("SELECT id, spouse1_id, spouse2_id, start_date, end_date, end_reason FROM marriages")

    return {
        "nodes": [dict(p) for p in persons],
        "parent_child": [dict(r) for r in parent_child],
        "marriages": [dict(m) for m in marriages],
    }
