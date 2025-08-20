import random
from fastapi import APIRouter, Query
from typing import List, Optional
from app.database import pictures_collection
from app.models import ApiPicture, ResultHint

router = APIRouter(prefix="/pictures", tags=["pictures"])

@router.get("/random", response_model=List[ApiPicture])
async def get_random_pictures(
    count: int = Query(6, ge=1, le=20),
    requested_language: Optional[str] = None
):
    # 1) Count documents in PublicPictures
    total = await pictures_collection.count_documents({})
    if total == 0:
        return []
    if total < count:
        count = total

    # 2) Generate unique random sequence numbers
    random_numbers = random.sample(range(1, total + 1), count)

    # 3) Build query
    query = {"sequence_number": {"$in": random_numbers}}
    if requested_language:
        query["requested_language"] = requested_language

    # 4) Project only needed fields
    projection = {
        "_id": 0,
        "sequence_number": 1,
        "image_name": 1,
        "requested_language": 1,
        "result.object_name_en": 1,
        "result.object_name_translated": 1,
        "result.object_description_en": 1,
        "result.object_description_translated": 1,
        "result.object_hint_en": 1,
        "result.object_hint_translated": 1,
        "image_base64": 1,
    }

    cursor = pictures_collection.find(query, projection=projection)
    docs = await cursor.to_list(length=count)

    # If not enough docs (due to language filter), fill remaining randomly
    if len(docs) < count:
        remaining = count - len(docs)
        filler_query = {}
        if requested_language:
            filler_query["requested_language"] = requested_language
        sampled = await pictures_collection.aggregate([
            {"$match": filler_query},
            {"$sample": {"size": remaining}},
            {"$project": projection}
        ]).to_list(length=remaining)
        docs.extend(sampled)

    # 5) Normalize response
    result = []
    for d in docs:
        result.append(ApiPicture(
            sequence_number=d.get("sequence_number"),
            image_name=d.get("image_name"),
            result=ResultHint(
                object_hint_en=(d.get("result") or {}).get("object_hint_en"),
                object_name_en=(d.get("result") or {}).get("object_name_en"),
                object_description_en=(d.get("result") or {}).get("object_description_en"),
            ),
            image_base64=d.get("image_base64"),
        ))
    return result
