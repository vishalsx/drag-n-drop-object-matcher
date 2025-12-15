from fastapi import HTTPException, Query, APIRouter, Request

from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import translation_set_collection, counters_collection
from app.models import TranslationSetCreate


router = APIRouter(prefix="/TS", tags=["translation sets"])


async def get_next_sequence(sequence_name: str) -> int:
    doc = await counters_collection.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return doc["seq"]

async def generate_set_id(org_id: str, user_id: str) -> str:
    seq = await get_next_sequence("translation_set_id")
    # Clean up IDs to be safe for URL/filenames if needed, though usually just string is fine
    # Ensuring defaults if None passed (though caller should handle)
    oid = org_id if org_id else "no_org"
    uid = user_id if user_id else "anonymous"
    return f"TS.{oid}.{uid}.{seq:04d}"


# --- Endpoint ---
@router.post("/save_translation_set")           
async def create_translation_set(payload: TranslationSetCreate, request: Request):
    try:
        # Resolve org_id and user_id from request state (set by middleware)
        user_info = getattr(request.state, "user", None)
        org_info = getattr(request.state, "org", None)

        current_user_id = "anonymous"
        if user_info:
            # Try different fields that might hold the user ID
            current_user_id = user_info.get("username") or user_info.get("sub") or user_info.get("user_id") or "anonymous"
        
        current_org_id = "no_org"
        # First try the explicitly valid org from middleware validation
        if org_info:
             current_org_id = org_info.get("org_id") or "no_org"
        # Fallback to user's org if available and valid org not set (though middleware usually handles org_id context)
        elif user_info and user_info.get("org_id"):
             current_org_id = user_info.get("org_id")
        
        # If payload provides IDs and we are anonymous/no_org, we COULD fallback to payload, 
        # but for security/consistency, let's stick to the token/state if we want to enforce it.
        # However, to be safe and flexible for this POC, if state is empty, check payload:
        if current_user_id == "anonymous" and payload.user_id:
             current_user_id = payload.user_id
        if current_org_id == "no_org" and payload.org_id:
             current_org_id = payload.org_id

        set_id = await generate_set_id(current_org_id, current_user_id)

        doc = {
            "set_id": set_id,
            "name": payload.name, #name chosen by the user at frontend
            "language": payload.language,
            "image_translation_ids": payload.image_translation_ids,
            "user_id": current_user_id,
            "org_id": current_org_id,
            "created_at": datetime.utcnow()
        }
        
        if payload.category:
            doc["category"] = payload.category
            
        if payload.field_of_study:
            doc["field_of_study"] = payload.field_of_study
        print("Saving translation set:", doc)
        result = await translation_set_collection.insert_one(doc)

        return {
            "success": True,
            "message": "Translation set saved successfully",
            "set_id": set_id,
            "mongo_id": str(result.inserted_id)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Helper function to format MongoDB documents ---
def format_doc(doc):
    doc["mongo_id"] = str(doc["_id"])
    del doc["_id"]
    return doc

# --- Endpoint ---
@router.get("/get_TS_list", response_model=List[dict])
async def get_translation_sets(
    request: Request,
    language: str = Query(..., description="Requested language"),
    object_category: Optional[str] = Query(None, description="Filter by Object Category"),
    field_of_study: Optional[str] = Query(None, description="Filter by Field of Study"),
    generic_search: Optional[str] = Query(None, description="Generic search term (placeholder)")
):
    try:
        # Extract user_id from request state
        user_info = getattr(request.state, "user", None)
        user_id = None
        if user_info:
             user_id = user_info.get("username") or user_info.get("sub") or user_info.get("user_id")

        # Logic: If user Id is not available then no TS_sets should be returned.
        if not user_id:
            return []

        query = {}
        # Mandatory filter
        query["language"] = language
        
        # User ID filter (backend verified)
        query["user_id"] = user_id

        # Optional filters
        if object_category:
            query["category"] = object_category
        
        if field_of_study:
            # Assuming the field key in DB is "field_of_study" (Note: currently not saved in create_translation_set)
            query["field_of_study"] = field_of_study
            
        # generic_search is a placeholder as requested

        cursor = translation_set_collection.find(query)
        results = []
        async for doc in cursor:
            results.append(format_doc(doc))

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_TS_preview/{set_id}", response_model=Optional[dict])
async def get_translation_set_preview(set_id: str):
    try:
        doc = await translation_set_collection.find_one({"set_id": set_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Translation set not found")

        return format_doc(doc)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))