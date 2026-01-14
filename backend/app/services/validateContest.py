
from app.database import organisations_collection, contests_collection, participants_collection
from app.contest_config import Contest
from bson.objectid import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
from app.utils.dateUtils import format_datetime_for_user

async def check_contest_time_validity(contest: Contest, current_time: datetime, contest_id: ObjectId, user_timezone: str = None):
    """
    Checks contest validity based on status and time.
    Performs automatic status transitions (Published -> Active, Active -> Completed).
    Returns (is_valid, error_message, new_status)
    - is_valid: Boolean allowing play
    - error_message: String if invalid
    - new_status: String if status was updated, else None
    - user_timezone: User's timezone for formatting error messages (e.g., "Asia/Kolkata")
    """
    # Ensure time zone aware
    c_start = contest.contest_start_at
    if c_start.tzinfo is None:
        c_start = c_start.replace(tzinfo=timezone.utc)
    c_end = contest.contest_end_at
    if c_end.tzinfo is None:
        c_end = c_end.replace(tzinfo=timezone.utc)
    
    status = contest.status
    print(f"\n[Validate] Check Time: ID={contest_id}, Status={status}, Now={current_time}, Start={c_start}, End={c_end}")

    if status == "Published":
        if current_time < c_start:
            print(f"[Validate] Too early. {current_time} < {c_start}")
            # Future contest - format in user's timezone
            start_formatted = format_datetime_for_user(c_start, user_timezone)
            return False, f"Contest has not yet started. Starts at {start_formatted}", None
        elif current_time > c_end:
            print(f"[Validate] Published but expired. {current_time} > {c_end}")
            # Already ended (Should rarely happen if transitions are working, but handles gaps)
            return False, "Contest has ended.", None
        else:
            print(f"[Validate] Published -> Active transition.")
            # Valid time range -> Change to Active
            await contests_collection.update_one(
                {"_id": contest_id},
                {"$set": {"status": "Active"}}
            )
            return True, None, "Active"

    elif status == "Active":
        if current_time > c_end:
            print(f"[Validate] Active but expired. Setting Completed.")
            # Expired -> Set to Completed
            await contests_collection.update_one(
                 {"_id": contest_id},
                 {"$set": {"status": "Completed"}}
            )
            return False, "Contest has ended.", "Completed"
        else:
            print(f"[Validate] Active and valid.")
            # Valid
            return True, None, None

    else:
        print(f"[Validate] Invalid status: {status}")
        # All other statuses (Draft, Hold, Completed, Archived, Cancelled)
        return False, f"Contest can not be played. Status is '{status}'.", None


async def validate_contest_for_login(contest_id: str, user_timezone: str = None):
    """
    Validates the contest and returns (contest_doc, search_text, error_message).
    
    Args:
        contest_id: Contest ID to validate
        user_timezone: User's timezone for formatting error messages (e.g., "Asia/Kolkata")
    """
    try:
        obj_id = ObjectId(contest_id)
    except Exception:
        return None, None, "Invalid contest ID format"

    contest_doc = await contests_collection.find_one({"_id": obj_id})
    if not contest_doc:
        return None, None, "Contest not found"

    try:
        contest = Contest(**contest_doc)
    except Exception as e:
        return None, None, f"Error processing contest data: {str(e)}"

    # 1. contest_type - must be "Local"
    if contest.contest_type != "Local":
        return None, None, "Only Local contests are supported in this mode"

    # 2. Status & Time Validation (Refactored)
    now = datetime.now(timezone.utc)
    is_valid, error_msg, new_status = await check_contest_time_validity(contest, now, obj_id, user_timezone)

    if not is_valid:
        return None, None, error_msg

    # Update local doc if status changed
    if new_status:
        contest_doc["status"] = new_status
        # Also update the pydantic object if we needed to use it further, but we mainly use correct_doc
        contest.status = new_status # Update helpful for content logic below if it uses status (it doesn't currently)

    # 3. content_type & search_text
    search_text = None
    if contest.content_type.lower() == "generic":
        if contest.areas_of_interest:
            search_text = contest.areas_of_interest[0]
        # else:
        #     return None, None, "Generic contest must have areas of interest defined"
    elif contest.content_type.lower() == "specialized":
        search_text = contest.specialized_theme or "specialized"
    else:
        return contest_doc, None, f"Unsupported content type: {contest.content_type}"

    return contest_doc, search_text, None


async def validate_contest_registration(contest_id: str, user_timezone: str = None):
    """
    Validates if registration is currently open for the given contest.
     Returns (is_valid, error_message, contest_doc)
    """
    try:
        obj_id = ObjectId(contest_id)
    except Exception:
        return False, "Invalid contest ID format", None

    contest_doc = await contests_collection.find_one({"_id": obj_id})
    if not contest_doc:
        return False, "Contest not found", None

    try:
        contest = Contest(**contest_doc)
    except Exception as e:
        return False, f"Error processing contest data: {str(e)}", None

    # Check Registration Timings
    now = datetime.now(timezone.utc)

    # Check Max Participants (0 means no limit)
    if contest.max_participants > 0:
        registration_count = await participants_collection.count_documents({"participations.contest_id": contest_id})
        if registration_count >= contest.max_participants:
            return False, f"Registration is full. Max limit of {contest.max_participants} participants reached.", contest_doc
    
    r_start = contest.registration_start_at
    if r_start.tzinfo is None:
        r_start = r_start.replace(tzinfo=timezone.utc)
    
    r_end = contest.registration_end_at
    if r_end.tzinfo is None:
        r_end = r_end.replace(tzinfo=timezone.utc)

    if now < r_start:
        start_formatted = format_datetime_for_user(r_start, user_timezone)
        return False, f"Registration hasn't started yet. It opens on {start_formatted}", contest_doc

    # Apply Grace Period to end time
    grace_seconds = contest.grace_period_seconds or 0
    effective_r_end = r_end + timedelta(seconds=grace_seconds)

    if now > effective_r_end:
        end_formatted = format_datetime_for_user(r_end, user_timezone)
        # If we are past grace period, show error. 
        # Note: We mention the original end time in the error message for clarity.
        return False, f"Registration has ended. It closed on {end_formatted} (including grace period).", contest_doc

    return True, None, contest_doc


def check_eligibility(contest: Contest, participant_data: Any):
    """
    Validates participant eligibility based on contest rules:
    - Age (min_age, max_age)
    - Country (allowed_countries)
    - School Required (entry_source.type == 'organisation')
    Returns (is_eligible, error_message)
    """
    rules = contest.eligibility_rules
    if not rules:
        return True, None

    # 1. Age Validation
    if participant_data.age < rules.min_age or participant_data.age > rules.max_age:
        return False, f"Age eligibility failed. Requirement: {rules.min_age}-{rules.max_age} years."

    # 2. Country Validation
    if rules.allowed_countries and participant_data.country not in rules.allowed_countries:
        return False, f"Registration not allowed from your country ({participant_data.country})."

    # 3. School Requirement
    if rules.school_required:
        if participant_data.entry_sources.type != "organisation":
            return False, "This contest is only open to school/organisation participants."

    return True, None
