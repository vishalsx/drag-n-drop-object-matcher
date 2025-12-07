from typing import Optional
from pydantic import BaseModel, Field
from typing import List


class ResultObject(BaseModel):
    object_id: str
    image_base64: str
    image_hash: str
    object_category: str
 
class QuizQA(BaseModel):
    question: str
    answer: str
    difficulty_level: str

class ResultTranslation(BaseModel):
    translation_id: str
    language: str
    object_description: str
    object_hint: str
    object_name: str
    object_short_hint: str
    quiz_qa: Optional[List[QuizQA]] = None

class ResultVoting(BaseModel):
    up_votes: Optional[int] = None
    down_votes: Optional[int] = None

# class ResultSheet(BaseModel):
#     sheet_id: Optional[str]
#     sheet_name: Optional[str]    

class ApiPicture(BaseModel):
    object: ResultObject
    translations: ResultTranslation
    voting: Optional[ResultVoting] = None
    # sheet: Optional[ResultSheet] = None


# --- Store a card ---
class TranslationSetCreate(BaseModel):
    name: str = Field(..., description="Name for this translation set")
    language: str = Field(..., description="Requested language (e.g., 'es')")
    image_translation_ids: List[str] = Field(..., description="List of image translation IDs")
    user_id: Optional[str] = Field(None, description="User ID, defaults to 'anonymous'")
    category: Optional[str] = Field(None, description="Object category, defaults to 'Any'")

class Organisation(BaseModel):
    org_code: str
    org_type: str # "Private" or "Public"
    org_id: str
    org_name: Optional[str] = None
    logo_url: Optional[str] = None
    languages_allowed: Optional[List[str]] = None