from app.database import objects_collection, translation_collection
import requests
import os
import logging
import random
from fastapi import HTTPException, Request
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EXTERNAL_API_URL = os.getenv("EXTERNAL_POOLSEARCH_API_URL", "http://localhost:8000/pool/recommendations")

async def get_pool_recommendations(
    search_query: str, 
    limit: int, 
    language: str = "English", 
    request: Request = None,
    org_id: Optional[str] = None
) -> list:
    """
    Fetch image recommendations from external pool API based on search query.
    Returns a list of translation_doc dictionaries similar to get_page_details.
    """
    
    headers = {}
    if request:
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header

    # 1. Fetch image recommendations from external API
    try:
        # if not org_id or org_id == "" or org_id == None:
        #     url = f"{EXTERNAL_API_URL}/public"
        # else:
        url = f"{EXTERNAL_API_URL}"
        params = {
            "search_query": search_query,
            "limit": limit*3,
            "language": language
        }
        
        logger.info(f"Fetching pool recommendations from: {url} with params: {params}")
        
        response = requests.post(url, params=params, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"External API error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"External API error: {response.text}")
        
        pool_data = response.json()
    except requests.RequestException as e:
        logger.error(f"Service unavailable: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

    if not pool_data:
        return []
    # 2. Extract image hashes from poolImage.image_hash
    image_hashes = []
    for item in pool_data:
        pool_image = item.get("poolImage", {})
        image_hash = pool_image.get("image_hash")
        print(f"\n\n🔴🔴image_hash: {image_hash}🔵🔵\n\n")
        if image_hash:
            image_hashes.append(image_hash)
    
    logger.info(f"Extracted {len(image_hashes)} image hashes from pool recommendations")
    
    # 3. Randomly select 'limit' number of hashes if we have more than limit
    if len(image_hashes) > limit:
        image_hashes = random.sample(image_hashes, limit)
        logger.info(f"Randomly selected {limit} images from {len(pool_data)} results")
    
    translation_docs = []
    
    # 3. For each image hash, lookup object_id and then translation
    for image_hash in image_hashes:

        obj_filter = {}
        trans_filter = {}    
        # Find object by hash
        obj_filter["image_hash"] = image_hash
        obj_filter["image_status"] = "Approved"
        trans_filter = {"translation_status": "Approved", "requested_language": language}
        
        obj_doc = None
        object_id = None
        if org_id:
            trans_filter["org_id"] = org_id
            obj_filter["org_id"] = org_id    
            obj_doc = await objects_collection.find_one(obj_filter)
            if obj_doc:
                object_id = obj_doc["_id"]
        if not obj_doc:
            obj_filter["org_id"] = None
            obj_filter["$or"] = [ # this is for objects collection
                {"org_id": {"$exists": False}},
                {"org_id": None},
                {"org_id": ""},
            ]
            obj_doc = await objects_collection.find_one(obj_filter)
            if obj_doc:
                object_id = obj_doc["_id"]
            else:
                logger.warning(f"Object not found for hash: {image_hash}")
                continue
        if object_id:
            trans_filter["object_id"] = object_id
            translation_doc = await translation_collection.find_one(trans_filter)        
        else:
            continue
        
        if translation_doc:
            # Construct the dict with projected fields
            doc = {
                "translation_id": translation_doc["_id"],
                "requested_language": translation_doc.get("requested_language"), # mapping language to requested_language
                "object_id": translation_doc.get("object_id"),
                "object_name": translation_doc.get("object_name"),
                "object_description": translation_doc.get("object_description"),
                "object_hint": translation_doc.get("object_hint"),
                "object_short_hint": translation_doc.get("object_short_hint"),
                "quiz_qa": translation_doc.get("quiz_qa"),
                "up_votes": translation_doc.get("up_votes", 0),
                "down_votes": translation_doc.get("down_votes", 0),
            }
            translation_docs.append(doc)
        else:
            logger.warning(f"No translation found for object_id: {object_id} in language: {language}")
    
    logger.info(f"Returning {len(translation_docs)} translation docs from pool recommendations")
    return translation_docs
