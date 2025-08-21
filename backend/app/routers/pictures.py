import random
import logging
from fastapi import APIRouter, Query
from typing import List, Optional
from app.database import pictures_collection
from app.models import ApiPicture, ResultHint

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pictures", tags=["pictures"])

@router.get("/random", response_model=List[ApiPicture])
async def get_random_pictures(
    count: int = Query(6, ge=1, le=20),
    language: Optional[str] = None   # 👈 renamed here
):
    logger.info(f"Requested API call with count={count}, language={language}")
    
    # 1) Build base filter
    base_query = {}
    if language and language.lower() != "english":   # 👈 Only filter if not English
        base_query["requested_language"] = language
        logger.info(f"Filtering by requested_language={language}")
    else:
        logger.info("Language is English → no filtering, fetching from all records")

   
    
    logger.info(f"Base query: {base_query}")

    # 2) Count documents in filtered set
    total = await pictures_collection.count_documents(base_query)
    logger.info(f"Total documents matching filter: {total}")

    if total == 0:
        logger.warning("No documents found for given language filter")
        return []

    if total < count:
        logger.info(f"Requested {count} but only {total} available. Reducing count.")
        count = total

    # 3) Use MongoDB $sample instead of manual random numbers
    pipeline = [
        {"$match": base_query},
        {"$sample": {"size": count}},
        {"$project": {
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
            "result.object_category": 1,
            "image_base64": 1,
        }}
    ]

    logger.info(f"Aggregation pipeline: {pipeline}")

    docs = await pictures_collection.aggregate(pipeline).to_list(length=count)
    logger.info(f"Retrieved {len(docs)} documents from DB")

    # 4) Normalize response
    result = []
    for d in docs:
        logger.debug(f"Processing document: {d}")
        res = d.get("result") or {}


        result.append(ApiPicture(
            sequence_number=d.get("sequence_number"),
            image_name=d.get("image_name"),
            result=ResultHint(
                object_hint_en=(d.get("result") or {}).get("object_hint_en"),
                object_name_en=(d.get("result") or {}).get("object_name_en"),
                object_description_en=(d.get("result") or {}).get("object_description_en"),
                object_description_translated=(d.get("result") or {}).get("object_description_translated"),
                object_name_translated=(d.get("result") or {}).get("object_name_translated"),
                object_hint_translated=(d.get("result") or {}).get("object_hint_translated"),
            ),
            image_base64=d.get("image_base64"),
        ))
    return result
