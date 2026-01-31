from fastapi import APIRouter, HTTPException, Form, Query
from pydantic import BaseModel
import requests
from typing import Optional, List, Dict, Any
from app.database import organisations_collection, participants_collection, contests_collection, users_collection
from app.contest_config import Contest
from app.contest_participant import Participant, ParticipantCreate, ParticipantLogin, Contestant, ContestParticipation, ContestParticipantCreate, ContestParticipantUpdate, ContestScoreSubmission, RoundScore
from bson import ObjectId
from datetime import datetime, timezone
from app.services.validateContest import validate_contest_for_login
router = APIRouter()
import hashlib
from fastapi import Depends, Request

async def get_current_user(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def get_current_user_optional(request: Request):
    return getattr(request.state, "user", None)

import os
from dotenv import load_dotenv  


load_dotenv()


EXTERNAL_LOGIN_URL = os.getenv("EXTERNAL_LOGIN_URL", "http://localhost:8000/auth/login")
EXTERNAL_CREATE_USER_URL = os.getenv("EXTERNAL_CREATE_USER_URL", "http://localhost:8000/auth/create-user")

class CreateUserRequest(BaseModel):
    username: str
    email_id: Optional[str] = None
    phone: Optional[str] = None
    password: str
    roles: List[str]
    languages_allowed: List[str]
    country: Optional[str] = None
    organisation_id: Optional[str] = None

class CreateUserResponse(BaseModel):
    message: str
    user_id: str

class GlobalUserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    languages: Optional[List[str]] = []

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    org_id: Optional[str] = None
    username: Optional[str] = None
    languages_allowed: Optional[List[str]] = None
    contest_details: Optional[Contest] = None
    search_text: Optional[str] = None
    contest_error: Optional[str] = None

async def validate_org(org_code: str, response: dict):
    org_coll = await organisations_collection.find_one({"org_code": org_code})
    print(f"\n\nOrg_code: {org_code}, Org Coll: {org_coll.get("org_type")}, Org_id: {org_coll.get("org_id")}, Languages Allowed: {org_coll.get("settings").get("language_allowed")}\n\n")
    
    if org_coll is None:
        return False
    else:
        if org_coll["org_type"] == "Public":
            return True
        elif org_coll["org_type"] == "Private":
            # Check if the user belongs to this private org
            # The response from external login should contain org_id
            if org_coll["org_id"] == response.get("org_id"):
                return True
            else:
                return False
        return False

import jwt
from datetime import datetime, timedelta

# ... (keep existing imports)
# Ensure SECRET_KEY matches middleware or use env var
# SECRET_KEY = "super-secret-key" 
# ALGORITHM = "HS256"
import os
from dotenv import load_dotenv


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key") 
ALGORITHM = os.getenv("ALGORITHM", "HS256")

def create_access_token(data: dict):
    to_encode = data.copy()
    if "exp" not in to_encode:
        expire = datetime.utcnow() + timedelta(days=1)
        to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@router.post("/auth/anonymous-login", response_model=LoginResponse)
async def anonymous_login(org_code: str = Form(...)):
    """
    Authenticate anonymously for public organizations.
    Uses org-specific anonymous credentials to obtain a token.
    """
    try:
        # Find organization by org_code
        org = await organisations_collection.find_one({"org_code": org_code})
        
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Verify it's a public organization
        if org.get("org_type") != "Public":
            raise HTTPException(status_code=403, detail="Anonymous login only available for public organizations")
        
        # Get anonymous credentials
        anonymous_userid = org.get("anonymous_userid")
        anonymous_password = org.get("anonymous_password")
        
        if not anonymous_userid or not anonymous_password:
            raise HTTPException(status_code=500, detail="Anonymous credentials not configured for this organization")
        
        # Authenticate with external service using anonymous credentials
        payload = {
            "username": anonymous_userid,
            "password": anonymous_password,
            "org_code": org_code
        }
        
        response = requests.post(EXTERNAL_LOGIN_URL, data=payload)
        
        if response.status_code != 200:
            try:
                error_detail = response.json()
            except:
                error_detail = response.text
            raise HTTPException(status_code=response.status_code, detail=f"External authentication failed: {error_detail}")
        
        response_data = response.json()
        
        # Enrich token with org context
        user_payload = {
            "sub": anonymous_userid,
            "username": anonymous_userid,
            "languages_allowed": response_data.get("languages_allowed"),
            "org_id": org.get("org_id"),
            "organisation_id": org.get("org_id"),
            "roles": response_data.get("roles", ["anonymous"]),
            "permissions": response_data.get("permissions"),
            "is_anonymous": True  # Flag to identify anonymous sessions
        }
        new_token = create_access_token(user_payload)
        
        return LoginResponse(
            access_token=new_token,
            token_type="bearer",
            org_id=org.get("org_id"),
            username=anonymous_userid
        )
        
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"External authentication service unavailable: {str(e)}")

@router.post("/auth/register")
async def register_global_user(data: GlobalUserRegister):
    """
    Register a new global user (not associated with any specific organization).
    """
    # 1. Check if user already exists
    existing_user = await users_collection.find_one({"username": data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    # 2. Create External User
    try:
        external_payload = {
            "username": data.username,
            "email_id": data.email,
            "password": data.password,
            "phone": data.phone if data.phone else f"GLOBAL_{data.username[:10]}",
            "roles": ["global_user"],
            "languages_allowed": data.languages if data.languages else ["English"], 
            "country": data.country or "Unknown",
            "organisation_id": None # Global user
        }

        response = requests.post(EXTERNAL_CREATE_USER_URL, json=external_payload)
        
        if response.status_code not in [200, 201]:
            raise HTTPException(status_code=400, detail=f"User creation failed: {response.text}")
        
        resp_data = response.json()
        external_user_id = resp_data.get("user_id")

    except requests.RequestException as e:
        print(f"Error calling external create-user: {str(e)}")
        raise HTTPException(status_code=503, detail="External user service unavailable")

    # 3. No longer creating local profile in participants_collection here.
    # It will be created when the user registers for their first contest.
    
    return {"message": "Registration successful", "user_id": external_user_id}

@router.post("/auth/login", response_model=LoginResponse)
async def login(
    username: str = Form(...), 
    password: str = Form(...), 
    org_code: Optional[str] = Form(None), 
    param2: Optional[str] = Form(None), 
    param3: Optional[str] = Form(None),
    timezone: Optional[str] = Form(None)
):
    try:
        payload = {
            "username": username,
            "password": password
        }
        if org_code:
            payload["org_code"] = org_code
        if param2:
            payload["param2"] = param2
        if param3:
            payload["param3"] = param3
        print(f"\n\nparam2: {param2}, param3: {param3}, org_code: {org_code}, timezone: {timezone}, payload:{payload}\n")

        # The external service expects application/x-www-form-urlencoded
        response = requests.post(EXTERNAL_LOGIN_URL, data=payload)
        if response.status_code == 200:
            response_data = response.json()
            
            # Check for logical errors or missing data even with 200 OK
            if "error" in response_data:
                raise HTTPException(status_code=401, detail=response_data.get("error", "Login failed"))
                
            if not response_data.get("username"):
                raise HTTPException(status_code=401, detail="Invalid token: missing username from provider")

            # --- ENRICH TOKEN START ---
            # The external token might not have all fields in its payload.
            # We create a new token signed by US, containing the info we need.
            user_payload = {
                "sub": response_data.get("username"),
                "username": response_data.get("username"),
                "languages_allowed": response_data.get("languages_allowed"),
                "org_id": response_data.get("org_id"),
                "organisation_id": response_data.get("org_id"),  # Also add as organisation_id
                "roles": response_data.get("roles"),
                "permissions": response_data.get("permissions")
            }
            new_token = create_access_token(user_payload)
            
            # Decode the token we just created to verify it contains org_id
            decoded_token = jwt.decode(new_token, SECRET_KEY, algorithms=[ALGORITHM])
            
            response_data["access_token"] = new_token
            # --- ENRICH TOKEN END ---

            if org_code:
                is_org_valid = await validate_org(org_code, response_data)
                if is_org_valid is False:
                     raise HTTPException(status_code=401, detail="Invalid access to organisation")
            
            # --- CONTEST VALIDATION START ---
            if param2 and param3 and param2.lower() == "contest":
                contest_doc, search_text, contest_error = await validate_contest_for_login(param3, timezone)
                if contest_doc:
                    # Convert ObjectId and datetime for JSON serialization
                    contest_doc["_id"] = str(contest_doc["_id"])
                    for key, val in contest_doc.items():
                        if isinstance(val, datetime):
                            contest_doc[key] = val.isoformat()
                    response_data["contest_details"] = contest_doc
                response_data["search_text"] = search_text
                response_data["contest_error"] = contest_error
                
            # --- CONTEST VALIDATION END ---

            return response_data
        else:
            # Forward the error from the external service
            try:
                error_detail = response.json()
            except:
                error_detail = response.text
            
            raise HTTPException(status_code=response.status_code, detail=error_detail)
            
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Login service unavailable: {str(e)}")
