from fastapi import APIRouter, HTTPException, Query, Depends, Request
from typing import List, Optional
from pydantic import BaseModel, Field
import requests
import os
import logging
from app.database import objects_collection, translation_collection
from app.models import PyObjectId, Book, Chapter, Page
from bson import ObjectId
from datetime import datetime, timezone
from app.routers.auth import get_current_user, get_current_user_optional

logger = logging.getLogger(__name__)

# Ensure you have a function to get current user, importing from auth or middleware
# Assuming auth/middleware puts user in dependency or similar.
# The user request mentioned `current_user: dict = Depends(get_current_user)`.
# I need to find where `get_current_user` is defined. Likely in `app.routers.auth` or `app.middleware`.
# For now I will mock or try to import it.

router = APIRouter()

EXTERNAL_API_URL = os.getenv("EXTERNAL_CURRICULUM_API_URL", "http://localhost:8000/curriculum")

# ---------- Endpoints ----------

@router.get("/curriculum/books/search", response_model=List[Book])
async def search_books(
    request: Request,
    search_text: str = Query(..., description="Text to search across title, author, subject, etc."),
    language: Optional[str] = Query(None, description="Optional language filter"),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    try:
        print(f"\n\n=== DEBUG: Curriculum Search Books Endpoint ===")
        print(f"Received search_text: {search_text}")
        print(f"Received language parameter: {language}")
        print(f"current_user from Depends(get_current_user): {current_user}")
        print(f"org_id in current_user: {current_user.get('org_id') if isinstance(current_user, dict) else 'N/A'}")
        print(f"organisation_id in current_user: {current_user.get('organisation_id') if isinstance(current_user, dict) else 'N/A'}")
        
        params = {"search_text": search_text}
        if language:
            params["language"] = language
        
        # Prioritize context-aware org_id from X-Org-ID header (via request.state.org)
        org_id = None
        if hasattr(request.state, "org") and request.state.org:
            org_id = request.state.org.get("org_id")
        
        # if not org_id:
        #     org_id = current_user.get("org_id") or current_user.get("organisation_id")
        
        if org_id:
            params["external_org_id"] = org_id
            
        print(f"Params being sent to external API: {params}")
        print(f"===\n\n")
        
        headers = {}
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header
        
        url = f"{EXTERNAL_API_URL}/books/search"
        logger.info(f"Calling external curriculum API: {url} with params: {params}")
            
        # Call external API
        response = requests.get(url, params=params, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=f"External API error: {response.text}")
    except requests.RequestException as e:
        logger.error(f"Failed to connect to external curriculum API: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@router.get("/curriculum/books/{book_id}/chapters", response_model=List[Chapter])
async def get_book_chapters(
    book_id: str,
    request: Request,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    try:
        headers = {}
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header

        auth_available = "YES" if auth_header else "NO"
        print(f"DEBUG: get_book_chapters - Auth Header Present: {auth_available}")
        if auth_header:
             print(f"DEBUG: Auth Header Length: {len(auth_header)}")
             
        response = requests.get(f"{EXTERNAL_API_URL}/books/{book_id}/chapters", headers=headers)
        
        print(f"DEBUG: External API URL: {EXTERNAL_API_URL}/books/{book_id}/chapters")
        print(f"DEBUG: Status Code: {response.status_code}")
        print(f"DEBUG: Response Text (first 200 chars): {response.text[:200]}")
        
        print(f"DEBUG: External API URL: {EXTERNAL_API_URL}/books/{book_id}/chapters")
        print(f"DEBUG: Status Code: {response.status_code}")
        print(f"DEBUG: Response Text: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            # External API returns Book object with chapters field, extract it
            return data.get("chapters", [])
        else:
            raise HTTPException(status_code=response.status_code, detail=f"External API error: {response.text}")
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@router.get("/curriculum/books/{book_id}/chapters/{chapter_identifier}/pages", response_model=List[Page])
async def get_chapter_pages(
    book_id: str, 
    chapter_identifier: str,
    request: Request,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    try:
        headers = {}
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header

        response = requests.get(f"{EXTERNAL_API_URL}/books/{book_id}/chapters/{chapter_identifier}/pages", headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=f"External API error: {response.text}")
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

# @router.get("/curriculum/play/page/{book_id}/{chapter_id}/{page_id}")
# async def get_page_game_data(
#     book_id: str, 
#     chapter_id: str, 
#     page_id: str,
#     request: Request,
#     current_user: dict = Depends(get_current_user)
# ):
#     from app.services.pagedetails import get_page_details
#     from app.storage.imagestore import retrieve_image
    
#     # 1. Fetch translation docs via service
#     translation_docs = await get_page_details(book_id, chapter_id, page_id, request=request)

#     if not translation_docs:
#         return []

#     game_objects = []
    
#     # 2. Process each translation doc to construct GameObject
#     for doc in translation_docs:
#         object_id = doc.get("object_id")
#         if not object_id:
#              continue

#         # Fetch object to get image data (similar to pictures.py pattern)
#         obj_doc = await objects_collection.find_one({"_id": object_id})
#         if not obj_doc:
#             logger.warning(f"Object not found for id: {object_id}")
#             continue
        
#         # Retrieve image from image_store or fallback to image_base64
#         image_store = obj_doc.get("image_store")
#         if image_store:
#             imagebase64 = await retrieve_image(image_store)
#             logger.info(f"Retrieved image from image_store for object_id={object_id}")
#         else:
#             imagebase64 = obj_doc.get("image_base64", "")
#             logger.info(f"Using image_base64 directly for object_id={object_id}")

#         game_objects.append({
#              "id": str(doc.get("translation_id")),
#              "description": doc.get("object_hint", ""),
#              "short_hint": doc.get("object_short_hint", ""),
#              "imageUrl": f"data:image/png;base64,{imagebase64}",
#              "imageName": doc.get("object_name", ""),
#              "object_description": doc.get("object_description", ""),
#              "upvotes": doc.get("up_votes", 0),
#              "downvotes": doc.get("down_votes", 0),
#              "objectCategory": obj_doc.get("object_category", "Unknown"),
#              "quiz_qa": doc.get("quiz_qa", [])
#         })

#     return game_objects
