from fastapi import FastAPI, HTTPException, Query

from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import motor.motor_asyncio
from app.database import objects_collection, translation_collection, translation_set_collection
from app.models import TranslationSetCreate


app = FastAPI()

# --- Helper to create readable unique IDs ---
async def generate_set_id() -> str:
    count = await translation_set_collection.count_documents({})
    return f"TS-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"

# --- Endpoint ---
@app.post("/save_translation_set")           
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
@app.get("/get_TS_list", response_model=List[dict])
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

