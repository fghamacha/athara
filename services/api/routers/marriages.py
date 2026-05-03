from fastapi import APIRouter, HTTPException, Depends
from typing import List
import asyncpg

from database import get_pool
from schemas.marriage import MarriageCreate, MarriageUpdate, MarriageResponse

router = APIRouter()


@router.post("/", response_model=MarriageResponse, status_code=201)
async def create_marriage(marriage: MarriageCreate, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        for pid in [str(marriage.spouse1_id), str(marriage.spouse2_id)]:
            exists = await conn.fetchval("SELECT id FROM persons WHERE id = $1", pid)
            if not exists:
                raise HTTPException(status_code=404, detail=f"Person {pid} not found")

        row = await conn.fetchrow(
            """INSERT INTO marriages (spouse1_id, spouse2_id, start_date, end_date, end_reason, notes)
               VALUES ($1,$2,$3,$4,$5,$6) RETURNING *""",
            str(marriage.spouse1_id), str(marriage.spouse2_id),
            marriage.start_date, marriage.end_date, marriage.end_reason, marriage.notes,
        )
        return dict(row)


@router.put("/{marriage_id}", response_model=MarriageResponse)
async def update_marriage(marriage_id: str, data: MarriageUpdate, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        updates = data.model_dump(exclude_unset=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
        row = await conn.fetchrow(
            f"UPDATE marriages SET {set_clause} WHERE id = $1 RETURNING *",
            marriage_id, *updates.values(),
        )
        if not row:
            raise HTTPException(status_code=404, detail="Marriage not found")
        return dict(row)


@router.delete("/{marriage_id}", status_code=204)
async def delete_marriage(marriage_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM marriages WHERE id = $1", marriage_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Marriage not found")
