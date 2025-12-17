from fastapi import APIRouter, HTTPException
from app.models import Organisation

router = APIRouter()

from app.database import organisations_collection

import re

@router.post("/determine_org", response_model=Organisation)
async def determine_org(path_segment: str):
    # Case-insensitive search
    org = await organisations_collection.find_one({"org_code": {"$regex": f"^{re.escape(path_segment)}$", "$options": "i"}})
    print(f"\n\nOrg data for {path_segment}: {org}\n\n")
    if org:
        # Extract logo_url from settings if it exists
        if "settings" in org and "logo_url" in org["settings"]:
            org["logo_url"] = org["settings"]["logo_url"]
        
        # Extract languages_allowed from settings if needed
        if "languages_allowed" not in org or org["languages_allowed"] is None:
            if "settings" in org and "language_allowed" in org["settings"]:
                org["languages_allowed"] = org["settings"]["language_allowed"]
        
        return Organisation(**org)
    
    # If not found, you might want to return a default or raise an error
    # For now, let's return a default public org or raise 404
    raise HTTPException(status_code=404, detail="Organisation not found")
