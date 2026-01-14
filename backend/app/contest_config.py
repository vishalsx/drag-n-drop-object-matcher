from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId
from datetime import datetime, timezone
from app.models import PyObjectId

# Multilingual dictionary
# e.g. {"en": "...", "de": "..."}
MultilingualStr = Dict[str, str]

class RoundDifficultyDistribution(BaseModel):
    easy: float = 0.0
    medium: float = 0.0
    hard: float = 0.0

class RoundStructure(BaseModel):
    round_name: str
    round_seq: int
    time_limit_seconds: int
    question_count: int
    object_count: Optional[int] = None
    hints_used: Optional[str] = None
    difficulty_distribution: RoundDifficultyDistribution

class LevelStructure(BaseModel):
    level_name: str
    level_seq: int
    game_type: str = "matching" # "matching" or "quiz"
    rounds: List[RoundStructure]

class GameStructure(BaseModel):
    level_count: int
    levels: List[LevelStructure]
    
class ScoringDifficultyWeights(BaseModel):
    easy: float = 1.0
    medium: float = 1.5
    hard: float = 2.0

class ScoringLanguageWeights(BaseModel):
    native: float = 0.7
    fluent: float = 1.0
    learning: float = 1.3

class TimeBonus(BaseModel):
    enabled: bool = True
    max_bonus: int = 3

class ScoringConfig(BaseModel):
    base_points: int = 10
    negative_marking: int = 2
    difficulty_weights: ScoringDifficultyWeights
    language_weights: ScoringLanguageWeights
    time_bonus: TimeBonus
    tie_breaker_rules: List[str]

class EligibilityRules(BaseModel):
    min_age: int
    max_age: int
    allowed_countries: List[str]
    school_required: bool

class VisibilityConfig(BaseModel):
    mode: str = "public"
    allowed_schools: List[str] = Field(default_factory=list)
    invite_only: bool = False

class ParticipationRewards(BaseModel):
    certificate: bool = True
    badge: Optional[str] = None

class RankBasedReward(BaseModel):
    rank_from: int
    rank_to: int
    reward: str

class RewardsConfig(BaseModel):
    participation: ParticipationRewards
    rank_based: List[RankBasedReward]

class Contest(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: MultilingualStr
    description: MultilingualStr
    status: str = "Draft"
    contest_type: str = "Global" # "Global" or "Local". For Local contests, it will be tagged under an existing org 
    supported_languages: List[str] = Field(default_factory=list) #comes from selected languages available in the private or Public org.
    areas_of_interest: Optional[List[str]] = Field(default_factory=list) #tags to search for the contest. Can match with field_of_study, object_category or tags
    org_id : Optional[str] = None #if contest_type is "Global" else its tagged under an existing org
    
    #Specilization of content as per the contest theme
    content_type: str = "Generic" # "General" or "Specialized". Specialized will define the theme and new content has to be developed
    specialized_theme: Optional[str] = None #Specialised theme for the contest. E.G. ART, MUSIC, SCIENCE, MATHS etc. new content need to be developed using specific AI prompts.and
    specialized_org_id: Optional[str] = None #if content_type is "Specialized" else None. This is the org_id of the new org entirty created for contest with specialized content
    # Specialized theme can be defined as an AI prompt to generate content for the contest in the org's AI driven prompt
    
    # Time Configuration
    registration_start_at: datetime
    registration_end_at: datetime
    contest_start_at: datetime
    contest_end_at: datetime
    grace_period_seconds: int = 0
    
    # Participation Rules
    max_participants: int = 0

    
    # Eligibility Rules
    eligibility_rules: EligibilityRules
    
    # Round Configuration
    #rounds_enabled: bool = False
    #round_structure: List[RoundStructure] = Field(default_factory=list)
    game_structure : GameStructure

    # Scoring Configuration
    scoring_config: ScoringConfig
    
    # Visibility & Access
    visibility: VisibilityConfig
    
    # Rewards
    rewards: RewardsConfig
    
    # Audit & Ownership
    # org_id is already defined earlier

    created_by: str = "anonymous"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    config_locked_at: Optional[datetime] = None

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }

class ContestCreate(Contest):
    # Overwrite fields that might not be provided during creation
    id: Optional[PyObjectId] = Field(None, alias="_id")
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    org_id: Optional[str] = None
    created_by: Optional[PyObjectId] = None
