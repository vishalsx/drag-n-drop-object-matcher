import sys
import os
from datetime import datetime
from uuid import uuid4
import json

# Add parent directory to sys.path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.event_analytics_models import (
    GameEvent,
    EventEnvelope,
    InteractionAttemptPayload,
    HintInteractionPayload,
    LevelCompletedPayload,
    LanguageSwitchPayload,
    GameCompletedPayload
)

def test_models():
    common_envelope = {
        "event_id": str(uuid4()),
        "timestamp": datetime.now().isoformat(),
        "user_id": "user_123",
        "session_id": "session_abc",
        "game_instance_id": "game_xyz",
        "mode": "matching",
        "language": "English",
        "level_sequence": 1
    }

    print("--- Testing InteractionAttemptPayload ---")
    event1 = {
        "envelope": {**common_envelope, "event_type": "interaction_attempt"},
        "payload": {
            "image_id": "img_001",
            "hint_id": "hint_001",
            "hint_type": "long_hint",
            "correct": True,
            "response_time_ms": 1500,
            "attempt_number": 1
        }
    }
    ge1 = GameEvent(**event1)
    print(f"Successfully validated InteractionAttempt: {ge1.payload.image_id}")

    print("\n--- Testing HintInteractionPayload ---")
    event2 = {
        "envelope": {**common_envelope, "event_type": "hint_interaction"},
        "payload": {
            "image_id": "img_001",
            "from_hint_type": "short_hint",
            "to_hint_type": "long_hint",
            "flip_count_for_image": 2
        }
    }
    ge2 = GameEvent(**event2)
    print(f"Successfully validated HintInteraction: {ge2.payload.from_hint_type} -> {ge2.payload.to_hint_type}")

    print("\n--- Testing LevelCompletedPayload ---")
    event3 = {
        "envelope": {**common_envelope, "event_type": "level_completed"},
        "payload": {
            "total_images": 5,
            "correct_answers": 4,
            "accuracy": 0.8,
            "total_time_ms": 45000
        }
    }
    ge3 = GameEvent(**event3)
    print(f"Successfully validated LevelCompleted: accuracy={ge3.payload.accuracy}")

    print("\n--- Testing LanguageSwitchPayload ---")
    event4 = {
        "envelope": {**common_envelope, "event_type": "language_switch"},
        "payload": {
            "previous_language": "English",
            "new_language": "Spanish",
            "images_replayed": 3
        }
    }
    ge4 = GameEvent(**event4)
    print(f"Successfully validated LanguageSwitch: {ge4.payload.previous_language} -> {ge4.payload.new_language}")

    print("\n--- Testing GameCompletedPayload ---")
    event5 = {
        "envelope": {**common_envelope, "event_type": "game_completed"},
        "payload": {
            "total_images": 15,
            "overall_accuracy": 0.9,
            "avg_response_time_ms": 2100.5,
            "cross_language_played": True
        }
    }
    ge5 = GameEvent(**event5)
    print(f"Successfully validated GameCompleted: overall_accuracy={ge5.payload.overall_accuracy}")

    print("\nAll models validated successfully!")

if __name__ == "__main__":
    try:
        test_models()
    except Exception as e:
        print(f"Validation failed: {e}")
        sys.exit(1)
