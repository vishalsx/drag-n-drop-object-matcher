from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import requests
from typing import Optional, List, Dict, Any
from app.database import organisations_collection, participants_collection, contests_collection, users_collection
from app.contest_config import Contest
from app.contest_participant import Participant, ParticipantCreate, ParticipantLogin, Contestant, ContestParticipation, ContestParticipantCreate, ContestParticipantUpdate, ContestScoreSubmission, RoundScore
from bson import ObjectId
from datetime import datetime, timezone
from app.services.validateContest import validate_contest_for_login, validate_contest_registration, check_eligibility
import hashlib
import os
import json
from dotenv import load_dotenv
import jwt
from datetime import timedelta

router = APIRouter()

load_dotenv()

EXTERNAL_LOGIN_URL = os.getenv("EXTERNAL_LOGIN_URL", "http://localhost:8000/auth/login")
EXTERNAL_CREATE_USER_URL = os.getenv("EXTERNAL_CREATE_USER_URL", "http://localhost:8000/auth/create-user")
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key") 
ALGORITHM = os.getenv("ALGORITHM", "HS256")

def create_access_token(data: dict):
    to_encode = data.copy()
    if "exp" not in to_encode:
        expire = datetime.utcnow() + timedelta(days=1)
        to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    org_id: Optional[str] = None
    username: Optional[str] = None
    user_id: Optional[str] = None
    contest_details: Optional[Dict[str, Any]] = None
    search_text: Optional[str] = None
    contest_error: Optional[str] = None
    email_id: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None

class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    total_score: int
    language_scores: Dict[str, int] = {}
    language_times: Dict[str, float] = {}
    is_current_user: bool = False

class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    average_time_all_participants: float = 0

def json_serializable(data):
    """
    Recursively converts ObjectId and datetime to JSON serializable formats (strings).
    Handles dicts, lists, sets, tuples and nested objects.
    """
    if isinstance(data, list):
        return [json_serializable(item) for item in data]
    if isinstance(data, tuple):
        return tuple(json_serializable(item) for item in data)
    if isinstance(data, set):
        return [json_serializable(item) for item in data]
    if isinstance(data, dict):
        return {key: json_serializable(val) for key, val in data.items()}
    if isinstance(data, ObjectId):
        return str(data)
    if isinstance(data, datetime):
        return data.isoformat()
    return data

@router.get("/contest/check-participant/{username}")
async def check_participant(username: str):
    # Find most recent participant record with this username
    participant = await participants_collection.find_one({"username": username})
    if participant:
        return json_serializable({
            "found": True,
            "message": "User already exists, enter the password to authenticate"
        })
    return json_serializable({"found": False})

class ParticipantAuthRequest(BaseModel):
    username: str
    password: str
    contest_id: Optional[str] = None

@router.post("/contest/authenticate-participant")
async def authenticate_participant(data: ParticipantAuthRequest):
    # 1. Authenticate with External Service
    try:
        login_payload = {
            "username": data.username,
            "password": data.password
        }
        print(f"[DEBUG-Auth] Authenticating participant: {data.username}")
        response = requests.post(EXTERNAL_LOGIN_URL, data=login_payload)
        print(f"[DEBUG-Auth] External Login Response Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"[DEBUG-Auth] Authentication successful for: {data.username}")
            # Authentication Successful
            ext_user = response.json()
            
            # Calculate Age from DOB
            dob_str = ext_user.get("dob")
            calculated_age = 0
            if dob_str:
                try:
                    dob = datetime.fromisoformat(dob_str.replace('Z', '+00:00')).date()
                    today = datetime.now(timezone.utc).date()
                    calculated_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                except Exception as e:
                    print(f"[DEBUG-Auth] Age calculation error: {e}")

            # Check Eligibility if contest_id is provided and DOB is available
            if data.contest_id and dob_str:
                contest_doc = await contests_collection.find_one({"_id": ObjectId(data.contest_id)})
                if contest_doc:
                    contest_obj = Contest(**contest_doc)
                    rules = contest_obj.eligibility_rules
                    if rules:
                        if calculated_age < rules.min_age or calculated_age > rules.max_age:
                            print(f"[DEBUG-Auth] Eligibility Failed: Age {calculated_age} not in {rules.min_age}-{rules.max_age}")
                            raise HTTPException(
                                status_code=403, 
                                detail=f"Age eligibility failed. Requirement: {rules.min_age}-{rules.max_age} years. Your age: {calculated_age}"
                            )
            elif data.contest_id and not dob_str:
                print(f"[DEBUG-Auth] Warning: No DOB found for existing user {data.username}. Skipping pre-auth age check.")

            # Fetch Local Participant Data (if any)
            participant = await participants_collection.find_one({"username": data.username})
            print(f"[DEBUG-Auth] Local participant found: {participant is not None}")
            
            # Default empty profile
            profile_data = {
                "email_id": ext_user.get("email_id") or ext_user.get("username"), 
                "age": calculated_age,
                "dob": dob_str,
                "country": ext_user.get("country", "India"),
                "phone": ext_user.get("phone") or ext_user.get("phone") or "",
                "address": ext_user.get("address", ""),
                "selected_languages": ext_user.get("languages_allowed", []),
                "roles": ext_user.get("roles", ["global_user"])
            }

            if participant:
                # Merge local data
                profile_data.update({
                    "age": calculated_age, # Always use calculated age from DOB
                    "dob": dob_str,
                    "address": ext_user.get("address", "") or participant.get("address"),
                })

            return json_serializable({
                "found": True,
                "data": profile_data
            })
            
        else:
            # Authentication Failed
            print(f"[DEBUG-Auth] Authentication failed for: {data.username}. Checking users collection...")
            # Check if user exists to differentiate between "Wrong Password" and "New User"
            user_exists = await users_collection.find_one({"username": data.username})
            print(f"[DEBUG-Auth] User exists in users collection: {user_exists is not None}")
            if user_exists:
                 print(f"[DEBUG-Auth] User found in central DB but authentication failed. Likely incorrect password.")
                 # User exists, so password must be wrong. Block registration.
                 raise HTTPException(status_code=401, detail="Incorrect password")
            else:
                 print(f"[DEBUG-Auth] User NOT found in central DB. Proceeding with New User flow.")
                 # User does not exist, proceed to registration
                 return json_serializable({"found": False, "message": "Authentication failed"})

    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail="External authentication service unavailable")

@router.post("/contest/register")
async def register_contest_participant(data: ContestParticipantCreate, user_timezone: Optional[str] = Query(None, alias="timezone")):
    # 0. Validate registration timing
    is_valid, error_msg, contest_doc = await validate_contest_registration(data.contest_id, user_timezone)
    if not is_valid:
        raise HTTPException(status_code=403, detail=error_msg)
        
    # 0.5 Check Eligibility Rules
    contest_obj = Contest(**contest_doc)
    is_eligible, eligibility_error = check_eligibility(contest_obj, data)
    if not is_eligible:
        raise HTTPException(status_code=403, detail=eligibility_error)
        
    # 1. Fetch contest details FIRST (Needed for org_id and defaults)
    contest = contest_doc # Re-use doc from validation
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
        
    languages_allowed = contest.get("supported_languages", [])
    organisation_id = contest.get("org_id")
    print(f"[DEBUG-Register] Registering {data.username} for contest {data.contest_id} (Org: {organisation_id})")

    # 2. Check if contestant exists locally
    contestant = await participants_collection.find_one({"username": data.username})
    print(f"[DEBUG-Register] Existing participant record found: {contestant is not None}")
    
    if contestant:
        print(f"[DEBUG-Register] Scenario 1: Existing Participant {data.username}")
        # NEW: Verify password for existing user via External Service
        # (Trust external service as source of truth)
        try:
            login_payload = {
                "username": data.username,
                "password": data.password
            }
            # Add param2/param3 if needed by external login? Auth service usually just needs user/pass
            login_response = requests.post(EXTERNAL_LOGIN_URL, data=login_payload)
            print(f"[DEBUG-Register] External Login Response Status: {login_response.status_code}")
            
            if login_response.status_code != 200:
                 raise HTTPException(status_code=401, detail="Incorrect password for existing username. Please verify your credentials.")
        except requests.RequestException:
             # Fallback: If external service is down, we cannot authenticate properly.
             # Security Decision: Do not fallback to local password as we shouldn't be storing it.
             raise HTTPException(status_code=503, detail="Authentication service unavailable")

        # Check if already registered for THIS contest
        if any(p.get("contest_id") == data.contest_id for p in contestant.get("participations", [])):
             raise HTTPException(status_code=400, detail="Username already registered for this contest")
             
        # Add new participation to existing contestant
        print(f"[DEBUG-Backend] Adding new participation to existing contestant: {data.username} for contest: {data.contest_id}")
        new_participation = {
            "contest_id": data.contest_id,
            "org_id": organisation_id,
            "role": "participant",
            "status": "applied",
            "entry_sources": data.entry_sources.model_dump(),
            "flags": {},
            "participation_dates": {"applied_at": datetime.now(timezone.utc)},
            "round_scores": [],
            "total_score": 0,
            "contest_completed": False,
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Update user profile with latest details from form
        update_fields = {
            "updated_at": datetime.now(timezone.utc)
        }

        result = await participants_collection.update_one(
            {"_id": contestant["_id"]},
            {
                "$push": {"participations": new_participation},
                "$set": update_fields
            }
        )
        # Existing user, so external_user_id is in their profile
        return json_serializable({"message": "Registration successful", "id": str(contestant["_id"]), "external_user_id": contestant.get("user_id")})
        
    else:
        # Check Central Users collection (Scenario 2 or 3)
        print(f"[DEBUG-Register] Scenario 2 or 3: Checking users collection for {data.username}")
        user_in_central = await users_collection.find_one({"username": data.username})
        print(f"[DEBUG-Register] User in central collection: {user_in_central is not None}")
        external_user_id = None

        if user_in_central:
            print(f"[DEBUG-Register] Scenario 2: Existing External User {data.username}")
            # Scenario 2: Existing External User (New to Contests)
            # Must authenticate via external service
            try:
                login_payload = {
                    "username": data.username,
                    "password": data.password
                }
                login_response = requests.post(EXTERNAL_LOGIN_URL, data=login_payload)
                print(f"[DEBUG-Register] External Login Response Status: {login_response.status_code}")
                
                if login_response.status_code != 200:
                     print(f"[DEBUG-Register] Authentication failed for existing central user: {data.username}")
                     raise HTTPException(status_code=401, detail="Incorrect password for existing username. Please verify your credentials or choose a different username.")
                
                ext_user = login_response.json()
                external_user_id = ext_user.get("user_id") or user_in_central.get("user_id") or user_in_central.get("_id")
                print(f"[DEBUG-Register] External User ID: {external_user_id}")
            except requests.RequestException:
                raise HTTPException(status_code=503, detail="Authentication service unavailable")
        else:
            # Scenario 3: New User (Not found in participants or users)
            print(f"[DEBUG-Register] Scenario 3: Creating New User {data.username}")
            try:
                external_payload = {
                    "username": data.username,
                    "email_id": data.email_id,
                    "password": data.password,
                    "dob": data.dob,
                    "address": data.address,
                    "phone": data.phone if data.phone else f"CONTEST_{data.username[:10]}",
                    "roles": ["global_user"],
                    "languages_allowed": data.selected_languages,
                    "country": data.country if data.country else "India",
                    "organisation_id": organisation_id
                }
                print(f"[DEBUG-Register] Registration Payload: {external_payload}")
                print(f"[DEBUG-Register] Calling External Create User URL: {EXTERNAL_CREATE_USER_URL}")
                response = requests.post(EXTERNAL_CREATE_USER_URL, json=external_payload)
                print(f"[DEBUG-Register] External Create User Response Status: {response.status_code}")
                
                if response.status_code == 200 or response.status_code == 201:
                    resp_data = response.json()
                    external_user_id = resp_data.get("user_id")
                    print(f"[DEBUG-Register] New External User ID: {external_user_id}")
                else:
                    # Fallback verification in case of race condition or stale local users collection
                    print(f"[DEBUG-Register] External creation failed ({response.status_code}). Trying fallback login verification...")
                    try:
                        login_payload = {
                            "username": data.username,
                            "password": data.password
                        }
                        login_response = requests.post(EXTERNAL_LOGIN_URL, data=login_payload)
                        print(f"[DEBUG-Register] Fallback Login Response Status: {login_response.status_code}")
                        
                        if login_response.status_code == 200:
                            print("Existing user verified via fallback login. Proceeding with contest registration.")
                            resp_data = login_response.json()
                            external_user_id = resp_data.get("user_id")
                            print(f"[DEBUG-Register] External User ID (Fallback): {external_user_id}")
                        else:
                            print(f"User creation failed ({response.status_code}) and fallback login failed: {login_response.text}")
                            raise HTTPException(status_code=400, detail=f"User registration failed. {response.text}")

                    except requests.RequestException:
                        raise HTTPException(status_code=400, detail=f"User creation failed: {response.text}")

            except requests.RequestException as e:
                print(f"Error calling external create-user: {str(e)}")
                raise HTTPException(status_code=503, detail="External user service unavailable")

        # 4. Create new contestant with first participation
        new_participation = {
            "contest_id": data.contest_id,
            "org_id": organisation_id,
            "role": "participant",
            "status": "applied",
            "entry_sources": data.entry_sources.model_dump(),
            "flags": {},
            "participation_dates": {"applied_at": datetime.now(timezone.utc)},
            "round_scores": [],
            "total_score": 0,
            "contest_completed": False,
            "updated_at": datetime.now(timezone.utc)
        }
        
        contestant_dict = {
            "username": data.username,
            # "password": hash_password(data.password), # REMOVED: Do not store local password
            "user_id": external_user_id,
            "participations": [new_participation],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = await participants_collection.insert_one(contestant_dict)
    return json_serializable({"message": "Registration successful", "id": str(result.inserted_id), "external_user_id": external_user_id})

@router.post("/contest/login", response_model=LoginResponse)
async def login_contest_participant(data: ParticipantLogin, user_timezone: Optional[str] = Query(None, alias="timezone")):
    
    # 1. Authenticate with External Service
    try:
        payload = {
            "username": data.username,
            "password": data.password,
            "param2": "contest",
            "param3": data.contest_id
        }
        
        response = requests.post(EXTERNAL_LOGIN_URL, data=payload)
        
        if response.status_code != 200:
            try:
                err = response.json()
                detail = err.get("detail") or err.get("error") or "Authentication failed"
            except:
                detail = "Authentication failed"
            raise HTTPException(status_code=401, detail=detail)
            
        external_data = response.json()
        
    except requests.RequestException as e:
        print(f"External login service error: {str(e)}")
        raise HTTPException(status_code=503, detail="Authentication service unavailable")

    # 2. Validate Local Registration (User must exist in contest)
    contestant = await participants_collection.find_one({"username": data.username})
    
    if not contestant:
        raise HTTPException(status_code=403, detail="User is not registered.")

    # Find specific participation
    participation = next((p for p in contestant.get("participations", []) if p.get("contest_id") == data.contest_id), None)
    
    if not participation:
        raise HTTPException(status_code=403, detail="User is not registered for this contest.")
    
    # 2.1 Check if contest already completed
    if participation.get("contest_completed", False):
        raise HTTPException(
            status_code=403, 
            detail=f"You have already completed this contest with a total score of {participation.get('total_score', 0)}. Contest cannot be replayed."
        )
    
    # 3. Enrich with contest details FIRST to get org_id
    contest_doc, search_text, contest_error = await validate_contest_for_login(data.contest_id, user_timezone)
    
    org_id = None
    if contest_doc:
        org_id = contest_doc.get("org_id")
        contest_doc["_id"] = str(contest_doc["_id"])
        for key, val in contest_doc.items():
            if isinstance(val, datetime):
                contest_doc[key] = val.isoformat()
    
    # 4. Generate Token
    user_payload = {
        "sub": contestant["username"],
        "username": contestant["username"],
        "contest_id": str(data.contest_id),
        "is_contest_participant": True,
        "roles": ["global_user"],
        "org_id": str(org_id or participation.get("org_id") or external_data.get("org_id") or ""),
        "organisation_id": str(org_id or participation.get("org_id") or external_data.get("org_id") or ""),
        "user_id": str(contestant.get("user_id") or external_data.get("user_id") or external_data.get("org_id") or ""),
        "email_id": external_data.get("email_id"),
        "phone": external_data.get("phone") or external_data.get("phone"),
        "country": external_data.get("country")
    }
    
    token = create_access_token(user_payload)
    
    response_data = {
        "access_token": token,
        "token_type": "bearer",
        "username": contestant["username"],
        "org_id": user_payload["org_id"],
        "user_id": user_payload["user_id"],
        "email_id": user_payload.get("email_id"),
        "phone": user_payload.get("phone"),
        "country": user_payload.get("country"),
        "address": external_data.get("address"),
        "age": 0,
        "dob": external_data.get("dob")
    }
    
    # Calculate Age for Login Response
    dob_str = external_data.get("dob")
    if dob_str:
        try:
            dob = datetime.fromisoformat(dob_str.replace('Z', '+00:00')).date()
            today = datetime.now(timezone.utc).date()
            calculated_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            response_data["age"] = calculated_age
        except Exception as e:
            print(f"[LOGIN] Age calculation error: {e}")
    
    if contest_doc:
        response_data["contest_details"] = json_serializable(contest_doc)
    
    response_data["search_text"] = search_text
    response_data["contest_error"] = contest_error
    
    return json_serializable(response_data)

@router.post("/contest/submit-scores")
async def submit_contest_scores(data: ContestScoreSubmission):
    """
    Submit contest scores for a participant after completing all rounds.
    Updates participant record with scores and completion status.
    """
    contestant = await participants_collection.find_one({
        "username": data.username,
        "participations.contest_id": data.contest_id
    })
    
    if not contestant:
        raise HTTPException(status_code=404, detail="Participant not found for this contest")
    
    # Convert round scores to RoundScore objects
    round_scores = []
    total_score = 0
    for score_data in data.round_scores:
        round_score = RoundScore(
            level=score_data.get("level", 1),
            round=score_data.get("round", 1),
            language=score_data.get("language"),
            score=score_data.get("score", 0),
            time_taken=score_data.get("time_taken", 0),
            completed_at=datetime.now(timezone.utc)
        )
        round_scores.append(round_score.model_dump())
        total_score += score_data.get("score", 0)
    
    update_data = {
        "participations.$.round_scores": round_scores,
        "participations.$.total_score": total_score,
        "updated_at": datetime.now(timezone.utc)
    }

    if data.is_final:
        update_data.update({
            "participations.$.contest_completed": True,
            "participations.$.contest_completed_at": datetime.now(timezone.utc),
            "participations.$.status": "completed",
            "participations.$.participation_dates.completed_at": datetime.now(timezone.utc),
        })
    else:
        # Mark as in_progress if not already completed/disqualified
        update_data.update({
            "participations.$.status": "in_progress"
        })
    
    result = await participants_collection.update_one(
        {
            "_id": contestant["_id"],
            "participations.contest_id": data.contest_id
        },
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update participant scores")
    
    return json_serializable({
        "message": "Scores submitted successfully",
        "total_score": total_score,
        "rounds_completed": len(round_scores)
    })

@router.get("/contest/{contest_id}/leaderboard", response_model=LeaderboardResponse)
async def get_contest_leaderboard(
    contest_id: str, 
    limit: int = Query(20, ge=1, le=100),
    current_username: Optional[str] = Query(None)
):
    """
    Get leaderboard for a contest showing top participants ranked by total score.
    Includes language-wise breakdown and global average time.
    """
    # Validate contest exists
    contest = await contests_collection.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    # 1. Pipeline for entries
    pipeline = [
        {"$unwind": "$participations"},
        {"$match": {"participations.contest_id": contest_id}},
        {"$project": {
            "username": 1,
            "total_score": "$participations.total_score",
            "round_scores": "$participations.round_scores"
        }},
        {"$sort": {"total_score": -1}},
        {"$limit": limit}
    ]
    
    cursor = participants_collection.aggregate(pipeline)
    results = await cursor.to_list(length=limit)
    
    # 2. Pipeline for global average time (only from completed participations)
    avg_pipeline = [
        {"$unwind": "$participations"},
        {"$match": {
            "participations.contest_id": contest_id,
            "participations.contest_completed": True
        }},
        {"$unwind": "$participations.round_scores"},
        {"$group": {
            "_id": "$_id",
            "total_participant_time": {"$sum": "$participations.round_scores.time_taken"}
        }},
        {"$group": {
            "_id": None,
            "global_avg_time": {"$avg": "$total_participant_time"}
        }}
    ]
    
    avg_result = await participants_collection.aggregate(avg_pipeline).to_list(length=1)
    global_avg_time = avg_result[0].get("global_avg_time", 0) if avg_result else 0

    # Build leaderboard with ranks and language split
    leaderboard = []
    for idx, entry in enumerate(results):
        # Aggregate scores and times by language for this participant
        language_scores = {}
        language_times = {}
        for rs in entry.get("round_scores", []):
            lang = rs.get("language")
            if lang:
                language_scores[lang] = language_scores.get(lang, 0) + rs.get("score", 0)
                language_times[lang] = language_times.get(lang, 0) + rs.get("time_taken", 0)

        leaderboard.append(LeaderboardEntry(
            rank=idx + 1,
            username=entry["username"],
            total_score=entry["total_score"],
            language_scores=language_scores,
            language_times=language_times,
            is_current_user=(entry["username"] == current_username if current_username else False)
        ))
    
    return LeaderboardResponse(
        entries=leaderboard,
        average_time_all_participants=global_avg_time
    )

@router.get("/contest/list/{org_id}", response_model=List[Dict[str, Any]])
async def list_org_contests(org_id: str):
    """
    List all contests for a specific organization.
    """
    cursor = contests_collection.find({"org_id": org_id})
    contests = await cursor.to_list(length=100)
    return [json_serializable(c) for c in contests]

class ContestEnterRequest(BaseModel):
    contest_id: str

class ContestProgressLog(BaseModel):
    contest_id: str
    username: str
    level: int
    round: int
    score: int
    language: str
    time_taken: float

@router.post("/contest/enter")
async def enter_contest(data: ContestEnterRequest, current_username: Optional[str] = Query(None)):
    """
    Called after login to verify contest status and handle resume logic.
    Returns resume state if user is re-entering an in-progress contest.
    """
    if not current_username:
        raise HTTPException(status_code=401, detail="User not authenticated")

    # 1. Fetch Contest Config
    contest = await contests_collection.find_one({"_id": ObjectId(data.contest_id)})
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
        
    contest_obj = Contest(**contest)
    max_attempts = contest_obj.max_incomplete_attempts

    # 2. Fetch Participant
    participant = await participants_collection.find_one({
        "username": current_username,
        "participations.contest_id": data.contest_id
    })
    
    if not participant:
        raise HTTPException(status_code=403, detail="User not registered for this contest")
        
    # Get specific participation
    participation = next((p for p in participant.get("participations", []) if p.get("contest_id") == data.contest_id), None)
    
    if not participation:
        raise HTTPException(status_code=403, detail="Participation record not found")

    # 3. Check Status & Disqualification
    if participation.get("is_disqualified", False):
        raise HTTPException(status_code=403, detail="You have been disqualified from this contest due to excessive incomplete attempts.")
        
    if participation.get("incomplete_attempts", 0) >= max_attempts:
        # Mark disqualified if not already
        await participants_collection.update_one(
            {"_id": participant["_id"], "participations.contest_id": data.contest_id},
            {"$set": {"participations.$.is_disqualified": True}}
        )
        raise HTTPException(status_code=403, detail="You have exceeded the maximum number of incomplete attempts.")

    # 4. Handle Entry/Resume Logic
    status = participation.get("status")
    contest_completed = participation.get("contest_completed", False)
    current_attempts = participation.get("incomplete_attempts", 0)
    new_attempts = current_attempts + 1

    print(f"[DEBUG-Backend] enter_contest: ID={data.contest_id}, User={current_username}")
    print(f"[DEBUG-Backend] Participation Data: {json.dumps(participation, default=str)}")

    # Check if this increment disqualifies them
    if new_attempts > max_attempts:
        # If status was already in_progress, they exceeded. 
        # If status was applied, weird but let's be safe.
        await participants_collection.update_one(
            {"_id": participant["_id"], "participations.contest_id": data.contest_id},
            {"$set": {"participations.$.is_disqualified": True}}
        )
        raise HTTPException(status_code=403, detail="You have exceeded the maximum number of attempts.")

    # Base update fields for every entry
    update_fields = {
        "participations.$.incomplete_attempts": new_attempts,
        "participations.$.last_active_at": datetime.now(timezone.utc)
    }

    if status == "applied":
        # First entry
        first_lang = contest_obj.supported_languages[0] if contest_obj.supported_languages else None
        update_fields["participations.$.status"] = "in_progress"
        update_fields["participations.$.current_level"] = 1
        update_fields["participations.$.current_round"] = 1
        update_fields["participations.$.current_language"] = first_lang
        
        await participants_collection.update_one(
            {"_id": participant["_id"], "participations.contest_id": data.contest_id},
            {"$set": update_fields}
        )
        
        # Prepare response
        response = {
            "status": "in_progress",
            "resume_level": 1,
            "resume_round": 1,
            "resume_language": first_lang,
            "current_score": 0,
            "attempts_left": max_attempts - new_attempts,
            "previous_scores": []
        }
    else:
        # Resume (status == "in_progress")
        await participants_collection.update_one(
            {"_id": participant["_id"], "participations.contest_id": data.contest_id},
            {"$set": update_fields}
        )
        
        response = {
            "status": status,
            "resume_level": participation.get("current_level", 1),
            "resume_round": participation.get("current_round", 1),
            "resume_language": participation.get("current_language"),
            "current_score": participation.get("total_score", 0),
            "attempts_left": max_attempts - new_attempts,
            "previous_scores": participation.get("round_scores", [])
        }

    return json_serializable(response)

@router.post("/contest/log-progress")
async def log_contest_progress(data: ContestProgressLog):
    """
    Background endpoint to log progress immediately after a round completes.
    Updates scores and advances the current level/round pointer.
    """
    # Verify participant exists
    participant = await participants_collection.find_one({
        "username": data.username,
        "participations.contest_id": data.contest_id
    })
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
        
    # Create RoundScore object
    round_score = RoundScore(
        level=data.level,
        round=data.round,
        language=data.language,
        score=data.score,
        time_taken=data.time_taken,
        completed_at=datetime.now(timezone.utc)
    )

    # 0. Check if this segment is already logged to prevent duplicates
    participation = next((p for p in participant.get("participations", []) if p["contest_id"] == data.contest_id), None)
    if participation:
        existing_scores = participation.get("round_scores", [])
        if any(rs.get("level") == data.level and 
               rs.get("round") == data.round and 
               rs.get("language") == data.language for rs in existing_scores):
            return {"status": "already_logged", "message": "This segment has already been recorded."}
    
    # 1. Fetch Contest Config to determine progression
    contest_doc = await contests_collection.find_one({"_id": ObjectId(data.contest_id)})
    if not contest_doc:
         raise HTTPException(status_code=404, detail="Contest not found")
    
    contest_obj = Contest(**contest_doc)
    supported_langs = contest_obj.supported_languages
    if not supported_langs:
        supported_langs = [data.language] # Fallback
    
    # 2. Build flattened queue of segments (Level -> Round -> Language)
    queue = []
    levels = sorted(contest_obj.game_structure.levels, key=lambda x: x.level_seq)
    for lvl in levels:
        rounds = sorted(lvl.rounds, key=lambda x: x.round_seq)
        for rnd in rounds:
            for lang in supported_langs:
                queue.append({
                    "level": lvl.level_seq,
                    "round": rnd.round_seq,
                    "language": lang
                })
    
    # 3. Find current segment index and determine NEXT
    current_idx = -1
    for i, seg in enumerate(queue):
        if (seg["level"] == data.level and 
            seg["round"] == data.round and 
            seg["language"] == data.language):
            current_idx = i
            break
    
    next_level = data.level
    next_round = data.round
    next_language = data.language # Default to same if not found
    contest_completed = False

    if current_idx != -1 and current_idx < len(queue) - 1:
        next_seg = queue[current_idx + 1]
        next_level = next_seg["level"]
        next_round = next_seg["round"]
        next_language = next_seg["language"]
    elif current_idx != -1 and current_idx == len(queue) - 1:
        contest_completed = True

    update_data = {
        "participations.$.current_level": next_level,
        "participations.$.current_round": next_round,
        "participations.$.current_language": next_language,
        "participations.$.contest_completed": contest_completed,
        "participations.$.last_active_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    if contest_completed:
        update_data["participations.$.contest_completed_at"] = datetime.now(timezone.utc)
        update_data["participations.$.status"] = "completed"
    
    # Atomic update: Push score, inc total, set next pointer
    await participants_collection.update_one(
        {
            "_id": participant["_id"],
            "participations.contest_id": data.contest_id
        },
        {
            "$push": {"participations.$.round_scores": round_score.model_dump()},
            "$inc": {"participations.$.total_score": data.score},
            "$set": update_data
        }
    )
    
    return {"status": "progress_logged"}

@router.get("/contest/{contest_id}/participant/summary")
async def get_participant_summary(contest_id: str, username: str = Query(...)):
    """
    Fetch language-wise aggregated scores for the participant to show on summary screen.
    """
    participant = await participants_collection.find_one({
        "username": username,
        "participations.contest_id": contest_id
    })
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant record not found")
        
    participation = next((p for p in participant.get("participations", []) if p.get("contest_id") == contest_id), None)
    
    if not participation:
        raise HTTPException(status_code=404, detail="Participation details not found")
        
    round_scores = participation.get("round_scores", [])
    languages = {}
    
    for rs in round_scores:
        lang = rs.get("language")
        score = rs.get("score", 0)
        if lang not in languages:
            languages[lang] = {"total": 0, "scores": []}
        languages[lang]["total"] += score
        languages[lang]["scores"].append(score)
        
    breakdown = []
    for lang, data in languages.items():
        breakdown.append({
            "language": lang,
            "total": data["total"],
            "calculation": " + ".join(map(str, data["scores"])) + f" = {data['total']}"
        })
        
    return json_serializable({
        "total_score": participation.get("total_score", 0),
        "breakdown": breakdown
    })
