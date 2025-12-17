from typing import Optional, List, Any
from pydantic import BaseModel, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from bson import ObjectId
from datetime import datetime, timezone

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(
        cls, core_schema: Any, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return {"type": "string"}




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
    story: Optional[str] = None
    moral: Optional[str] = None

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
    category: Optional[str] = Field(None, description="Object category")
    field_of_study: Optional[str] = Field(None, description="Field of Study")
    org_id: Optional[str] = Field(None, description="Organization ID, defaults to 'None'")

class Organisation(BaseModel):
    org_code: str
    org_type: str # "Private" or "Public"
    org_id: str
    org_name: Optional[str] = None
    logo_url: Optional[str] = None
    languages_allowed: Optional[List[str]] = None



# ---------- Book Model Integration ----------

class ImageRef(BaseModel):
    image_id: Optional[str] = Field(None, description="Unique identifier for the image (DB or local)")
    image_hash: str = Field(..., description="Hash of the image for integrity verification")
    position: Optional[int] = Field(None, description="Order of image within the page")
    object_name: Optional[str] = Field(None, description="Name of the object in the image")
    model_config = {"json_encoders": {ObjectId: str}}


class Page(BaseModel):
    page_id: Optional[str] = Field(None, description="Unique identifier for the page (DB or local)")
    page_number: Optional[int] = Field(None, ge=1, description="Page number within the chapter")
    title: Optional[str] = None
    images: List[ImageRef] = Field(default_factory=list)
    story: Optional[str] = None
    moral: Optional[str] = None
    model_config = {"json_encoders": {ObjectId: str}}


class Chapter(BaseModel):
    chapter_id: Optional[str] = Field(None, description="Unique identifier for the chapter (DB or local)")
    chapter_number: Optional[int] = Field(None, ge=1, description="Sequential number of the chapter")
    chapter_name: str
    description: Optional[str] = None
    pages: List[Page] = Field(default_factory=list)

    model_config = {"json_encoders": {ObjectId: str}}


class Book(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    title: str
    language: str
    author: Optional[str] = None
    subject: Optional[str] = None
    education_board: Optional[str] = None
    grade_level: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    chapters: Optional[List[Chapter]] = Field(default_factory=list)
    # --- New Count Fields ---
    chapter_count: int = Field(0, description="Total number of chapters in the book")
    page_count: int = Field(0, description="Total number of pages across all chapters")
    image_count: int = Field(0, description="Total number of images across all pages")
    book_status: str = Field("Draft", description="Status of the book: Draft/Released/Verified/Approved")
    created_by: Optional[str] = Field(None, description="User ID of the creator") # simplified default
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    org_id: Optional[str] = Field(None, description="Organization ID associated with the book")
    
    model_config = {"populate_by_name": True, "json_encoders": {ObjectId: str}}
