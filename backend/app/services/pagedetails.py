from app.database import objects_collection, translation_collection, books_collection
import requests
import os
import logging
from fastapi import HTTPException, Request
from app.models import Book, Chapter, Page, ImageRef
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EXTERNAL_API_URL = os.getenv("EXTERNAL_CURRICULUM_API_URL", "http://localhost:8000/curriculum")

async def get_page_details(book_id: str, chapter_id: str, page_id: str, request: Request = None, language:str = "English", org_id: str = None) -> list:
    """
    Fetch image hashes for a page from local books collection and resolve them to translation documents.
    Returns a list of translation_doc dictionaries similar to get_random_picture_details.
    """
    
    # 1. Fetch book data from local database
    try:
        book_doc = await books_collection.find_one({"_id": ObjectId(book_id)})
        if not book_doc:
            logger.error(f"Book not found: {book_id}")
            raise HTTPException(status_code=404, detail="Book not found")
        
        # 2. Find the specific chapter and page
        target_page = None
        for chapter in book_doc.get("chapters", []):
            if str(chapter.get("chapter_id")) == str(chapter_id):
                for page in chapter.get("pages", []):
                    if str(page.get("page_id")) == str(page_id):
                        target_page = page
                        break
            if target_page:
                break
        
        if not target_page:
            logger.error(f"Page not found: {page_id} in chapter {chapter_id} of book {book_id}")
            raise HTTPException(status_code=404, detail="Page not found")

        images = target_page.get("images", [])
        page_story = target_page.get("story")
        page_moral = target_page.get("moral")

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error retrieving page details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not images:
        return []

    translation_docs = []

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
