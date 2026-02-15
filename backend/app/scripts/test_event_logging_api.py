import requests
from datetime import datetime
from uuid import uuid4
import json

BASE_URL = "http://localhost:8081/event-analytics"

def test_log_event():
    common_envelope = {
        "event_id": str(uuid4()),
        "timestamp": datetime.now().isoformat(),
        "user_id": "test_user",
        "session_id": "test_session",
        "game_instance_id": "test_game",
        "mode": "matching",
        "language": "English",
        "level_sequence": 1
    }

    event = {
        "envelope": {**common_envelope, "event_type": "interaction_attempt"},
        "payload": {
            "image_id": "img_test",
            "hint_id": "hint_test",
            "hint_type": "long_hint",
            "correct": True,
            "response_time_ms": 1200,
            "attempt_number": 1
        }
    }

    print(f"Sending event to {BASE_URL}/log...")
    try:
        response = requests.post(f"{BASE_URL}/log", json=event)
        response.raise_for_status()
        print("Success!")
        print(f"Response: {response.json()}")
    except requests.exceptions.RequestException as e:
        print(f"Failed to log event: {e}")
        if hasattr(e, 'response') and e.response is not None:
             print(f"Response details: {e.response.text}")

if __name__ == "__main__":
    test_log_event()
