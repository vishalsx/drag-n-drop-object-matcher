from app.database import objects_collection, translation_collection
import requests
import os
import logging
from fastapi import HTTPException, Request
from app.models import Book, Chapter, Page, ImageRef

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EXTERNAL_API_URL = os.getenv("EXTERNAL_CURRICULUM_API_URL", "http://localhost:8000/curriculum")

async def get_page_details(book_id: str, chapter_id: str, page_id: str, request: Request = None, language:str = "English", org_id: str = None) -> list:
    """
    Fetch image hashes for a page from external API and resolve them to translation documents.
    Returns a list of translation_doc dictionaries similar to get_random_picture_details.
    """
    
    headers = {}
    if request:
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header

    # 1. Fetch images (image_hashes) from external API
    try:
        url = f"{EXTERNAL_API_URL}/books/{book_id}/chapters/{chapter_id}/pages/{page_id}/images"
        logger.info(f"Fetching images from: {url}")
        
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
             logger.error(f"External API error: {response.text}")
             # We might raise exception or return empty list. curriculum.py raised HTTPException.
             # Since this is a service, raising HTTPException is acceptable if intended for API usage,
             # or we let the caller handle exceptions.
             # Assuming this service is used by router directly, raising HTTPException is fine.
             raise HTTPException(status_code=response.status_code, detail=f"External API error: {response.text}")
        
        images_data = response.json()
    except requests.RequestException as e:
         logger.error(f"Service unavailable: {str(e)}")
         raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

    if not images_data:
        return []

    translation_docs = []
    
    # Extract the images array from the response
    images = images_data.get("images", [])
    
    if not images:
        logger.info(f"No images found for page {page_id}")
        return []
    
    # Extract story and moral from the page level response
    page_story = images_data.get("story")
    page_moral = images_data.get("moral")

    # 2. Process each image
    for img in images:
        # Handle both string (direct hash) and dict (ImageRef object) formats
        if isinstance(img, str):
            image_hash = img
        else:
            image_hash = img.get("image_hash")
        
        if not image_hash:
            continue
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
             # Note: pictures.py expects 'translation_id', not '_id'.
             doc = {
                 "translation_id": translation_doc["_id"],
                 "requested_language": translation_doc.get("requested_language"), # mapping language to requested_language
                 "object_id": translation_doc.get("object_id"),
                 "object_name": translation_doc.get("object_name"),
                 "object_description": translation_doc.get("object_description"),
                 "object_hint": translation_doc.get("object_hint"),
                 "object_short_hint": translation_doc.get("object_short_hint"),
                 "quiz_qa": translation_doc.get("quiz_qa"),
                 "story": page_story,
                 "moral": page_moral,

                 "up_votes": translation_doc.get("up_votes", 0),
                 "down_votes": translation_doc.get("down_votes", 0),
                 # Extra fields if needed
             }
             translation_docs.append(doc)

    logger.info(f"Retrieved {len(translation_docs)} translation documents for page {page_id}")
    return translation_docs
