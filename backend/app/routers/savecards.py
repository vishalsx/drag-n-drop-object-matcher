from fastapi import HTTPException, Query, APIRouter

from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import translation_set_collection
from app.models import TranslationSetCreate


router = APIRouter(prefix="/TS", tags=["translation sets"])


# --- Helper to create readable unique IDs ---
async def generate_set_id() -> str:
    count = await translation_set_collection.count_documents({})
    return f"TS-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"

# --- Endpoint ---
@router.post("/save_translation_set")           
async def create_translation_set(payload: TranslationSetCreate):
    try:
        set_id = await generate_set_id()

        doc = {
            "set_id": set_id,
            "name": payload.name, #name chosen by the user at frontend
            "language": payload.language,
            "image_translation_ids": payload.image_translation_ids,
            "user_id": payload.user_id or "anonymous",
            "category": payload.category or "Any",
            "created_at": datetime.utcnow()
        }
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
    name: Optional[str] = Query(None, description="Filter by translation set name"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    category: Optional[str] = Query(None, description="Filter by category")
):
    try:
        query = {}
        if name:
            query["name"] = {"$regex": name, "$options": "i"}  # partial match, case-insensitive
        if user_id:
            query["user_id"] = user_id
        if category:
            query["category"] = category

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