from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel
import requests
from typing import Optional, List
from app.database import organisations_collection

router = APIRouter()

from fastapi import Depends, Request

async def get_current_user(request: Request):
    user = getattr(request.state, "user", None)
    # If middleware didn't populate it (e.g. no header), usually we raise 401
    # But for some flexible endpoints we might allow optional. 
    # The user requirement implies "mandatory", so let's raise if missing.
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

import os
from dotenv import load_dotenv  


load_dotenv()


EXTERNAL_LOGIN_URL = os.getenv("EXTERNAL_LOGIN_URL", "http://localhost:8000/auth/login")

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    org_name: Optional[str] = None
    logo_url: Optional[str] = None
    org_id: Optional[str] = None
    languages_allowed: Optional[List[str]] = None
    username: Optional[str] = None

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

@router.post("/auth/login", response_model=LoginResponse)
async def login(username: str = Form(...), password: str = Form(...), org_code: Optional[str] = Form(None), param2: Optional[str] = Form(None), param3: Optional[str] = Form(None)):
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
        print(f"\n\nPayload: {payload}\n\n")

        # The external service expects application/x-www-form-urlencoded
        response = requests.post(EXTERNAL_LOGIN_URL, data=payload)
        print(f"\n\n=== DEBUG: External Login Status Code: {response.status_code} ===")
        if response.status_code == 200:
            response_data = response.json()
            print(f"\n\n=== DEBUG: External Login Response Data ===")
            print(f"username: {response_data.get('username')}")
            print(f"org_id: {response_data.get('org_id')}")
            print(f"roles: {response_data.get('roles')}")
            print(f"languages_allowed: {response_data.get('languages_allowed')}")
            print(f"permissions: {response_data.get('permissions')}")
            print(f"Full response keys: {response_data.keys()}")
            print(f"===\n\n")
            
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
            print(f"\n\n=== DEBUG: Token Enrichment ===")
            print(f"User Payload for JWT: {user_payload}")
            new_token = create_access_token(user_payload)
            print(f"New Enriched Token: {new_token[:50]}...")
            print(f"===\n\n")
            
            # Decode the token we just created to verify it contains org_id
            decoded_token = jwt.decode(new_token, SECRET_KEY, algorithms=[ALGORITHM])
            print(f"\n\n=== DEBUG: Decoded Enriched Token ===")
            print(f"Decoded payload: {decoded_token}")
            print(f"===\n\n")
            
            response_data["access_token"] = new_token
            # --- ENRICH TOKEN END ---

            if org_code:
                is_org_valid = await validate_org(org_code, response_data)
                if is_org_valid is False:
                     raise HTTPException(status_code=401, detail="Invalid access to organisation")
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

