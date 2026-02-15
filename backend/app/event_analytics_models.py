from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Union
from datetime import datetime
from uuid import UUID

class EventEnvelope(BaseModel):
    """Unified schema core for all events."""
    event_id: UUID
    event_type: Literal[
        "interaction_attempt",
        "hint_interaction",
        "level_completed",
        "language_switch",
        "game_completed",
        "game_started"
    ]
    timestamp: datetime
    user_id: str
    session_id: str
    game_instance_id: str
    mode: Literal["matching", "quiz"]
    language: str
    level_sequence: int
    schema_version: int = 1

class InteractionAttemptPayload(BaseModel):
    """Covers both Matching and Quiz attempts."""
    translation_id: str
    
    # Matching-specific
    hint_type: Optional[Literal["long_hint", "short_hint", "name"]] = None
    
    # Quiz-specific
    difficulty_level: Optional[Literal["low", "medium", "high", "very_high"]] = None
    question_id: str = ""
    selected_answer_id: str = ""
    
    correct: bool
    response_time_ms: int
    attempt_number: int

class HintInteractionPayload(BaseModel):
    """Tracks hint flipping or behavior."""
    translation_id: str
    from_hint_type: Literal["long_hint", "short_hint", "name"]
    to_hint_type: Literal["long_hint", "short_hint", "name"]
    flip_count_for_translation: int

class LevelCompletedPayload(BaseModel):
    """Summary for a completed level (matching or quiz)."""
    total_images: int
    total_questions: Optional[int] = None
    correct_answers: int
    accuracy: float
    total_time_ms: int

class LanguageSwitchPayload(BaseModel):
    """Tracks cross-language retention and transfer."""
    previous_language: str
    new_language: str
    images_replayed: int

class GameCompletedPayload(BaseModel):
    """High-level summary event for the entire game."""
    total_images: int
    overall_accuracy: float
    avg_response_time_ms: float
    cross_language_played: bool

class GameStartedPayload(BaseModel):
    """Event triggered when a new game instance begins."""
    is_replay: bool
    previous_game_instance_id: Optional[str] = None
    reason: Optional[
        Literal[
            "first_time",
            "retry_after_failure",
            "retry_after_completion",
            "language_switch"
        ]
    ] = None

class GameEvent(BaseModel):
    """Final event wrapper linking envelope to payload."""
    envelope: EventEnvelope
    payload: Union[
        InteractionAttemptPayload,
        HintInteractionPayload,
        LevelCompletedPayload,
        LanguageSwitchPayload,
        GameCompletedPayload,
        GameStartedPayload
    ]
