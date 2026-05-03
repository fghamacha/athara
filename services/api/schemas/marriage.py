from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid


class MarriageCreate(BaseModel):
    spouse1_id: uuid.UUID
    spouse2_id: uuid.UUID
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    end_reason: Optional[str] = None  # death | divorce | separation
    notes: Optional[str] = None


class MarriageUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    end_reason: Optional[str] = None
    notes: Optional[str] = None


class MarriageResponse(BaseModel):
    id: uuid.UUID
    spouse1_id: uuid.UUID
    spouse2_id: uuid.UUID
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    end_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
