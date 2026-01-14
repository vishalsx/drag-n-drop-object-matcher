from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class RoundStatus(str, Enum):
    """Status of a contest round attempt"""
    COMPLETED = "completed"
    QUIT = "quit"
    TIMEOUT = "timeout"


class WrongMatchAttempt(BaseModel):
    """Records a wrong match attempt for a picture"""
    matched_with: str = Field(..., description="ID of the object incorrectly matched with")
    timestamp: datetime = Field(..., description="When the wrong match occurred")


class PictureInteractionMetrics(BaseModel):
    """Tracks per-image statistics during gameplay"""
    picture_id: str = Field(..., description="ID of the image/object")
    hint_flip_count: int = Field(0, ge=0, description="Number of times hint was flipped/viewed")
    wrong_match_attempts: List[WrongMatchAttempt] = Field(
        default_factory=list,
        description="Array of wrong match attempts with timestamps"
    )
    time_to_match_seconds: Optional[float] = Field(
        None,
        ge=0,
        description="Time from round start to successful match (null if never matched)"
    )
    match_timestamp: Optional[datetime] = Field(
        None,
        description="When the image was successfully matched (null if never matched)"
    )


class FocusLossEvent(BaseModel):
    """Records a focus loss event"""
    timestamp: datetime = Field(..., description="When focus was lost")
    duration_seconds: Optional[float] = Field(
        None,
        ge=0,
        description="How long focus was lost (null if still in progress)"
    )


class PauseEvent(BaseModel):
    """Records a game pause event"""
    timestamp: datetime = Field(..., description="When game was paused")
    duration_seconds: Optional[float] = Field(
        None,
        ge=0,
        description="How long the pause lasted (null if still paused)"
    )


class BehavioralMetrics(BaseModel):
    """Captures user engagement patterns during gameplay"""
    tab_switch_count: int = Field(0, ge=0, description="Number of tab switches detected")
    focus_loss_events: List[FocusLossEvent] = Field(
        default_factory=list,
        description="Array of focus loss timestamps and durations"
    )
    pause_events: List[PauseEvent] = Field(
        default_factory=list,
        description="Array of pause timestamps and durations"
    )
    visibility_changes: int = Field(
        0,
        ge=0,
        description="Number of page visibility changes (Page Visibility API)"
    )


class DeviceNetworkInfo(BaseModel):
    """Device and connection context information"""
    platform: Optional[str] = Field(
        None,
        description="OS/device type (Windows, macOS, iOS, Android, Linux, etc.)"
    )
    browser: Optional[str] = Field(
        None,
        description="Browser name and version (e.g., 'Chrome 120.0', 'Safari 17.1')"
    )
    app_version: Optional[str] = Field(
        None,
        description="Frontend application version"
    )
    network_type: Optional[str] = Field(
        None,
        description="Connection type: wifi, cellular, ethernet, unknown, or none"
    )
    screen_resolution: Optional[str] = Field(
        None,
        description="Display resolution (e.g., '1920x1080')"
    )
    viewport_size: Optional[str] = Field(
        None,
        description="Browser viewport dimensions (e.g., '1600x900')"
    )
    user_agent: Optional[str] = Field(
        None,
        description="Full user agent string for detailed analysis"
    )


class AbnormalTimingFlag(BaseModel):
    """Records an abnormal timing pattern"""
    picture_id: str = Field(..., description="ID of the picture involved")
    flag_type: str = Field(
        ...,
        description="Type of anomaly: too_fast, too_slow, impossible_sequence, etc."
    )
    value: float = Field(..., description="The anomalous timing value in seconds")
    timestamp: datetime = Field(..., description="When the anomaly occurred")


class RapidGuessingPattern(BaseModel):
    """Records a sequence of matches faster than human threshold"""
    picture_ids: List[str] = Field(..., description="Sequence of pictures matched rapidly")
    average_time_seconds: float = Field(..., ge=0, description="Average time per match in the sequence")
    start_timestamp: datetime = Field(..., description="When the rapid sequence started")


class AntiCheatMetrics(BaseModel):
    """Integrity and cheat detection metrics"""
    copy_paste_attempts: int = Field(
        0,
        ge=0,
        description="Number of copy/paste events detected during gameplay"
    )
    rapid_guessing_patterns: List[RapidGuessingPattern] = Field(
        default_factory=list,
        description="Sequences of matches faster than human threshold (< 0.5s average)"
    )
    repeated_pattern_score: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Statistical measure of answer pattern repetition (0=random, 1=highly repetitive)"
    )
    abnormal_timing_flags: List[AbnormalTimingFlag] = Field(
        default_factory=list,
        description="Array of timing anomalies detected"
    )
    keyboard_mouse_ratio: Optional[float] = Field(
        None,
        ge=0.0,
        description="Ratio of keyboard to mouse interactions (null if not tracked)"
    )
    suspicious_activity_score: int = Field(
        0,
        ge=0,
        le=100,
        description="Aggregate suspicion score (0=clean, 100=highly suspicious)"
    )


class ContestAttemptAnalytics(BaseModel):
    """Main analytics document for a contest attempt"""
    attempt_id: Optional[str] = Field(
        None,
        description="Unique identifier for this attempt (auto-generated by backend)"
    )
    contest_id: str = Field(..., description="ID of the contest being played")
    user_id: str = Field(..., description="User identifier (must match authenticated user)")
    language_name: str = Field(..., description="Language selected for this round")
    round_number: int = Field(1, ge=1, description="Which round number (for multi-round contests)")
    round_status: RoundStatus = Field(..., description="Completion status of the round")
    
    objects_played: List[str] = Field(
        ...,
        description="Array of object IDs used in this round"
    )
    picture_interactions: List[PictureInteractionMetrics] = Field(
        ...,
        description="Detailed interaction metrics for each picture"
    )
    
    total_time_seconds: float = Field(..., ge=0, description="Total round duration in seconds")
    score_achieved: int = Field(..., ge=0, description="Final score for this round")
    
    behavioral_metrics: BehavioralMetrics = Field(
        default_factory=BehavioralMetrics,
        description="User engagement and behavioral patterns"
    )
    device_network_info: DeviceNetworkInfo = Field(
        default_factory=DeviceNetworkInfo,
        description="Device and network context"
    )
    anti_cheat_metrics: AntiCheatMetrics = Field(
        default_factory=AntiCheatMetrics,
        description="Integrity and anti-cheat detection data"
    )
    
    started_at: datetime = Field(..., description="Round start timestamp (ISO 8601)")
    completed_at: Optional[datetime] = Field(
        None,
        description="Round end timestamp (null if quit before completion)"
    )
    
    client_timezone: Optional[str] = Field(
        None,
        description="User's timezone offset (e.g., '+05:30', '-08:00')"
    )
    session_id: Optional[str] = Field(
        None,
        description="Browser session identifier for grouping attempts"
    )
    
    # Metadata
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this record was created in the database"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "contest_id": "contest_xyz",
                "user_id": "user_123",
                "language_name": "Spanish",
                "round_number": 1,
                "round_status": "completed",
                "objects_played": ["obj_001", "obj_002", "obj_003"],
                "picture_interactions": [
                    {
                        "picture_id": "obj_001",
                        "hint_flip_count": 2,
                        "wrong_match_attempts": [
                            {
                                "matched_with": "obj_002",
                                "timestamp": "2025-12-27T12:00:05Z"
                            }
                        ],
                        "time_to_match_seconds": 12.5,
                        "match_timestamp": "2025-12-27T12:00:12Z"
                    }
                ],
                "total_time_seconds": 120.0,
                "score_achieved": 85,
                "started_at": "2025-12-27T12:00:00Z",
                "completed_at": "2025-12-27T12:02:00Z",
                "client_timezone": "+05:30"
            }
        }
    }


class ContestAttemptAnalyticsResponse(BaseModel):
    """Response model for analytics submission"""
    success: bool = Field(..., description="Whether the submission was successful")
    attempt_id: str = Field(..., description="Generated attempt ID")
    message: Optional[str] = Field(None, description="Additional message or error details")
