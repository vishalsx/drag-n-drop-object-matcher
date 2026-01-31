from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId
from datetime import datetime, timezone
from app.models import PyObjectId


class Participant(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    username: str
    email: Optional[str] = None
    password_hash: str
    contest_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

class EntrySource(BaseModel):
    type: str  # "organisation", "public", "individual"
    org_name: Optional[str] = None
    org_id: Optional[str] = None
    invited_by: Optional[str] = None
    registered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ParticipationTimeline(BaseModel):
    applied_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    activated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class RoundScore(BaseModel):
    level: Optional[int] = 1 # Optional for backward compatibility
    round: Optional[int] = 1 # Optional for backward compatibility
    language: str
    score: int
    time_taken: float = 0 # In seconds
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FlagsControls(BaseModel):
    is_late_registration: bool = False
    manual_review_required: bool = False
    cheating_flagged: bool = False

class ContestParticipation(BaseModel):
    contest_id: str
    org_id: Optional[str] = None
    role: str = "participant"
    status: str = "applied"
    
    # Resume & Tracking Logic
    current_level: int = 1
    current_round: int = 1
    current_language: Optional[str] = None
    incomplete_attempts: int = 0
    is_disqualified: bool = False
    last_active_at: Optional[datetime] = None
    entry_sources: EntrySource
    flags: FlagsControls = Field(default_factory=FlagsControls)
    
    participation_dates: ParticipationTimeline = Field(default_factory=ParticipationTimeline)

    # Score tracking
    round_scores: List[RoundScore] = Field(default_factory=list)
    total_score: int = 0
    
    # Persistence for consistency across levels
    assigned_object_ids: List[str] = Field(default_factory=list)
    
    contest_completed: bool = False
    contest_completed_at: Optional[datetime] = None
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Contestant(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    username: str
    password: Optional[str] = None # Hashed (Deprecated: Auth via external service)
    email_id: str
    
    # Profile
    age: int
    age_group: Optional[str] = None
    country: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    
    # External Link
    user_id: Optional[PyObjectId] = None
    roles: List[str] = Field(default_factory=lambda: ["global_user"])
    
    participations: List[ContestParticipation] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    def model_post_init(self, __context: Any) -> None:
        if not self.age_group:
             if self.age < 13:
                 self.age_group = "child"
             elif self.age < 20:
                 self.age_group = "teen"
             else:
                 self.age_group = "adult"

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

class ContestParticipantCreate(BaseModel):
    contest_id: str
    org_id: Optional[str] = None
    username: str
    password: str
    age: int
    email_id: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    country: str
    entry_sources: EntrySource
    selected_languages: List[str]

class ContestParticipantUpdate(BaseModel):
    username: Optional[str] = None
    age: Optional[int] = None
    email_id: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None
    selected_languages: Optional[List[str]] = None
    flags: Optional[FlagsControls] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ParticipantCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    contest_id: str

class ParticipantLogin(BaseModel):
    username: str
    password: str
    contest_id: str

class ContestScoreSubmission(BaseModel):
    contest_id: str
    username: str
    round_scores: List[Dict[str, Any]]  # [{"language": "English", "score": 45}, ...]
    is_final: bool = False
