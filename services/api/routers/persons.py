from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
import asyncpg
import boto3
from botocore.client import Config
import os
import uuid as uuid_lib

from database import get_pool
from schemas.person import PersonCreate, PersonUpdate, PersonResponse, PersonWithRelations

router = APIRouter()


def minio_client():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("MINIO_ENDPOINT", "http://minio:9000"),
        aws_access_key_id=os.getenv("MINIO_ACCESS_KEY", "athara"),
        aws_secret_access_key=os.getenv("MINIO_SECRET_KEY", "athara123"),
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


BUCKET = os.getenv("MINIO_BUCKET", "athara")


def ensure_bucket(client):
    try:
        client.head_bucket(Bucket=BUCKET)
    except Exception:
        client.create_bucket(Bucket=BUCKET)


@router.get("/", response_model=List[PersonResponse])
async def list_persons(search: Optional[str] = None, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        if search:
            rows = await conn.fetch(
                """SELECT * FROM persons
                   WHERE to_tsvector('french', first_name || ' ' || last_name)
                         @@ plainto_tsquery('french', $1)
                   ORDER BY last_name, first_name""",
                search,
            )
        else:
            rows = await conn.fetch("SELECT * FROM persons ORDER BY last_name, first_name")
        return [dict(r) for r in rows]


@router.post("/", response_model=PersonResponse, status_code=201)
async def create_person(person: PersonCreate, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO persons
               (first_name, last_name, birth_date, death_date, birth_place, profession, bio, gender)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *""",
            person.first_name, person.last_name, person.birth_date, person.death_date,
            person.birth_place, person.profession, person.bio, person.gender,
        )
        return dict(row)


@router.get("/{person_id}", response_model=PersonWithRelations)
async def get_person(person_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        person = await conn.fetchrow("SELECT * FROM persons WHERE id = $1", person_id)
        if not person:
            raise HTTPException(status_code=404, detail="Person not found")

        parents = await conn.fetch(
            """SELECT p.* FROM persons p
               JOIN parent_child pc ON pc.parent_id = p.id
               WHERE pc.child_id = $1""",
            person_id,
        )
        children = await conn.fetch(
            """SELECT p.* FROM persons p
               JOIN parent_child pc ON pc.child_id = p.id
               WHERE pc.parent_id = $1""",
            person_id,
        )
        marriages = await conn.fetch(
            """SELECT m.*,
                      CASE WHEN m.spouse1_id::text = $1 THEN m.spouse2_id ELSE m.spouse1_id END AS spouse_id,
                      p.first_name AS spouse_first_name,
                      p.last_name  AS spouse_last_name,
                      p.photo_url  AS spouse_photo_url
               FROM marriages m
               JOIN persons p ON p.id = CASE WHEN m.spouse1_id::text = $1 THEN m.spouse2_id ELSE m.spouse1_id END
               WHERE m.spouse1_id::text = $1 OR m.spouse2_id::text = $1
               ORDER BY m.start_date""",
            person_id,
        )
        siblings = await conn.fetch(
            """SELECT DISTINCT p.* FROM persons p
               JOIN parent_child pc1 ON pc1.child_id = p.id
               WHERE pc1.parent_id IN (
                   SELECT parent_id FROM parent_child WHERE child_id::text = $1
               ) AND p.id::text != $1""",
            person_id,
        )

        result = dict(person)
        result["parents"] = [dict(r) for r in parents]
        result["children"] = [dict(r) for r in children]
        result["marriages"] = [dict(r) for r in marriages]
        result["siblings"] = [dict(r) for r in siblings]
        return result


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(person_id: str, person: PersonUpdate, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT id FROM persons WHERE id = $1", person_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Person not found")

        updates = person.model_dump(exclude_unset=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
        row = await conn.fetchrow(
            f"UPDATE persons SET {set_clause} WHERE id = $1 RETURNING *",
            person_id, *updates.values(),
        )
        return dict(row)


@router.delete("/{person_id}", status_code=204)
async def delete_person(person_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM persons WHERE id = $1", person_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Person not found")


@router.post("/{person_id}/photo", response_model=PersonResponse)
async def upload_photo(
    person_id: str,
    file: UploadFile = File(...),
    pool: asyncpg.Pool = Depends(get_pool),
):
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT id FROM persons WHERE id = $1", person_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Person not found")

    content = await file.read()
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    key = f"photos/{person_id}/{uuid_lib.uuid4()}.{ext}"

    client = minio_client()
    ensure_bucket(client)
    client.put_object(Bucket=BUCKET, Key=key, Body=content, ContentType=file.content_type or "image/jpeg")

    url = client.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=3600 * 24 * 365)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE persons SET photo_url = $2 WHERE id = $1 RETURNING *", person_id, url
        )
        return dict(row)


@router.get("/{person_id}/ancestors")
async def get_ancestors(person_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """WITH RECURSIVE ancestors AS (
                SELECT pc.parent_id, 1 AS depth
                FROM parent_child pc WHERE pc.child_id = $1
                UNION ALL
                SELECT pc.parent_id, a.depth + 1
                FROM parent_child pc
                JOIN ancestors a ON pc.child_id = a.parent_id
            )
            SELECT p.*, a.depth FROM persons p
            JOIN ancestors a ON a.parent_id = p.id
            ORDER BY a.depth, p.last_name""",
            person_id,
        )
        return [dict(r) for r in rows]


@router.get("/{person_id}/descendants")
async def get_descendants(person_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """WITH RECURSIVE descendants AS (
                SELECT pc.child_id, 1 AS depth
                FROM parent_child pc WHERE pc.parent_id = $1
                UNION ALL
                SELECT pc.child_id, d.depth + 1
                FROM parent_child pc
                JOIN descendants d ON pc.parent_id = d.child_id
            )
            SELECT p.*, d.depth FROM persons p
            JOIN descendants d ON d.child_id = p.id
            ORDER BY d.depth, p.last_name""",
            person_id,
        )
        return [dict(r) for r in rows]
