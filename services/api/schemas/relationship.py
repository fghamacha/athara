from pydantic import BaseModel
from datetime import datetime
import uuid


class RelationshipCreate(BaseModel):
    parent_id: uuid.UUID
    child_id: uuid.UUID
    relationship_type: str = "biological"  # biological | adoptive


class RelationshipResponse(BaseModel):
    id: uuid.UUID
    parent_id: uuid.UUID
    child_id: uuid.UUID
    relationship_type: str
    created_at: datetime

    class Config:
        from_attributes = True
