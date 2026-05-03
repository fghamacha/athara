from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class AttachmentResponse(BaseModel):
    id: uuid.UUID
    person_id: uuid.UUID
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    storage_key: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
