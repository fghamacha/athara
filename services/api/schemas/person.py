from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import uuid


class PersonCreate(BaseModel):
    first_name: str
    last_name: str
    birth_date: Optional[date] = None
    death_date: Optional[date] = None
    birth_place: Optional[str] = None
    profession: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[str] = None


class PersonUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None
    death_date: Optional[date] = None
    birth_place: Optional[str] = None
    profession: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[str] = None
    photo_url: Optional[str] = None


class PersonResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    birth_date: Optional[date] = None
    death_date: Optional[date] = None
    birth_place: Optional[str] = None
    profession: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    gender: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PersonWithRelations(PersonResponse):
    parents: List[PersonResponse] = []
    children: List[PersonResponse] = []
    siblings: List[PersonResponse] = []
    marriages: List[dict] = []
