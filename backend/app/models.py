from typing import Optional
from pydantic import BaseModel

class ResultObject(BaseModel):
    object_id: str
    image_base64: str
    image_hash: str
    object_category: str
 
class ResultTranslation(BaseModel):
    translation_id: str
    language: str
    object_description: str
    object_hint: str
    object_name: str
    object_short_hint: str

class ResultVoting(BaseModel):
    up_votes: Optional[int] = None
    down_votes: Optional[int] = None

class ResultSheet(BaseModel):
    sheet_id: Optional[str]
    sheet_name: Optional[str]    

class ApiPicture(BaseModel):
    object: ResultObject
    translations: ResultTranslation
    voting: Optional[ResultVoting] = None
    sheet: Optional[ResultSheet] = None
