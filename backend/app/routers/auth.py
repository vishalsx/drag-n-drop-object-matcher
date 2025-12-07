from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel
import requests
from typing import Optional, List
from app.database import organisations_collection

router = APIRouter()

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
SECRET_KEY = "super-secret-key" 
ALGORITHM = "HS256"

def create_access_token(data: dict):
    to_encode = data.copy()
    if "exp" not in to_encode:
        expire = datetime.utcnow() + timedelta(days=1)
        to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/auth/login", response_model=LoginResponse)
async def login(username: str = Form(...), password: str = Form(...), org_code: Optional[str] = Form(None)):
    try:
        payload = {
            "username": username,
            "password": password
        }
        if org_code:
            payload["org_code"] = org_code
        print(f"\n\nPayload: {payload}\n\n")

        # The external service expects application/x-www-form-urlencoded
        response = requests.post(EXTERNAL_LOGIN_URL, data=payload)
        # print(f"\n\nResponse from external login: {response.json()}\n\n")
        print(f"\n\nResponse from external login: {response.status_code}\n\n")
        if response.status_code == 200:
            response_data = response.json()
            
            # --- ENRICH TOKEN START ---
            # The external token might not have all fields in its payload.
            # We create a new token signed by US, containing the info we need.
            user_payload = {
                "sub": response_data.get("username"),
                "username": response_data.get("username"),
                "languages_allowed": response_data.get("languages_allowed"),
                "org_id": response_data.get("org_id"),
                "roles": response_data.get("roles"),
                "permissions": response_data.get("permissions")
            }
            new_token = create_access_token(user_payload)
            response_data["access_token"] = new_token
            print(f"\n\nEnriched Token Payload: {user_payload}\n\n")
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

