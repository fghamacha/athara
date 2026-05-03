from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from typing import List, Optional
import asyncpg
import boto3
from botocore.client import Config
import os
import uuid as uuid_lib

from database import get_pool
from schemas.attachment import AttachmentResponse

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


@router.get("/{person_id}", response_model=List[AttachmentResponse])
async def list_attachments(person_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM attachments WHERE person_id = $1 ORDER BY created_at DESC",
            person_id,
        )
        return [dict(r) for r in rows]


@router.post("/{person_id}", response_model=AttachmentResponse, status_code=201)
async def upload_attachment(
    person_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    pool: asyncpg.Pool = Depends(get_pool),
):
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT id FROM persons WHERE id = $1", person_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Person not found")

    content = await file.read()
    key = f"attachments/{person_id}/{uuid_lib.uuid4()}_{file.filename}"

    client = minio_client()
    ensure_bucket(client)
    client.put_object(
        Bucket=BUCKET, Key=key, Body=content,
        ContentType=file.content_type or "application/octet-stream",
    )

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO attachments (person_id, file_name, file_type, file_size, storage_key, description)
               VALUES ($1,$2,$3,$4,$5,$6) RETURNING *""",
            person_id, file.filename, file.content_type, len(content), key, description,
        )
        return dict(row)


@router.get("/{person_id}/{attachment_id}/url")
async def get_download_url(person_id: str, attachment_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM attachments WHERE id = $1 AND person_id = $2",
            attachment_id, person_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Attachment not found")

    client = minio_client()
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": row["storage_key"]},
        ExpiresIn=3600,
    )
    return {"url": url, "file_name": row["file_name"]}


@router.delete("/{person_id}/{attachment_id}", status_code=204)
async def delete_attachment(person_id: str, attachment_id: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM attachments WHERE id = $1 AND person_id = $2",
            attachment_id, person_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Attachment not found")

        client = minio_client()
        try:
            client.delete_object(Bucket=BUCKET, Key=row["storage_key"])
        except Exception:
            pass

        await conn.execute("DELETE FROM attachments WHERE id = $1", attachment_id)
