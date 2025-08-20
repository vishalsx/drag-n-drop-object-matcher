from typing import Optional
from pydantic import BaseModel

class ResultHint(BaseModel):
    object_hint_en: Optional[str] = None
    object_name_en: Optional[str] = None
    object_description_en: Optional[str] = None

class ApiPicture(BaseModel):
    sequence_number: Optional[int] = None
    image_name: Optional[str] = None
    result: ResultHint
    image_base64: Optional[str] = None
