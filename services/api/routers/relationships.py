from fastapi import APIRouter, HTTPException, Depends
import asyncpg

from database import get_pool
from schemas.relationship import RelationshipCreate, RelationshipResponse

router = APIRouter()


@router.post("/", response_model=RelationshipResponse, status_code=201)
async def add_parent_child(rel: RelationshipCreate, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        for pid in [str(rel.parent_id), str(rel.child_id)]:
            exists = await conn.fetchval("SELECT id FROM persons WHERE id = $1", pid)
            if not exists:
                raise HTTPException(status_code=404, detail=f"Person {pid} not found")
        try:
            row = await conn.fetchrow(
                """INSERT INTO parent_child (parent_id, child_id, relationship_type)
                   VALUES ($1,$2,$3) RETURNING *""",
                str(rel.parent_id), str(rel.child_id), rel.relationship_type,
            )
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail="Relationship already exists")


@router.delete("/{relationship_id}", status_code=204)
async def delete_relationship(relationship_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM parent_child WHERE id = $1", relationship_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Relationship not found")
