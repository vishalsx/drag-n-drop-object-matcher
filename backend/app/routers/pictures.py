import random
import logging
from fastapi import APIRouter, Query, Request
from typing import List, Optional
from app.database import objects_collection, translation_set_collection, translation_collection
from app.models import ApiPicture, ResultObject, ResultTranslation, ResultVoting
import os
import httpx
from app.storage.imagestore import retrieve_image  
from app.services.TScarddetails import get_TS_card_details
from app.services.randompicdetails import get_random_picture_details
from app.services.poolrecommendations import get_pool_recommendations
from app.services.pagedetails import get_page_details


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pictures", tags=["pictures"])

@router.get("/random", response_model=List[ApiPicture])
async def get_random_pictures(
    request: Request,
    count: int = Query(6, ge=1, le=20, description="Number of random pictures to fetch"),
    language: Optional[str] = Query(None, description="Language filter for pictures"),
    category: Optional[str] = Query(None, description="Object category filter"),
    field_of_study: Optional[str] = Query(None, description="Field of study filter"),
    translation_set_id: Optional[str] = Query(None, description="Optional translation set ID to pick pictures from"),
    book_id: Optional[str] = Query(None, description="Book ID for playlist"),
    chapter_id: Optional[str] = Query(None, description="Chapter ID for playlist"),
    page_id: Optional[str] = Query(None, description="Page ID for playlist"),
    search_text: Optional[str] = Query(None, description="Search text for pool recommendations"),
    org_code: Optional[str] = Query(None, description="Organization code from URL path")
):

    # Extract org_id from request state (set by AuthMiddleware)
    org = getattr(request.state, "org", None)
    org_id = org["org_id"] if org else None

    # Verify context: If request comes from a non-org context (no org_code), ignore any cached org_id
    if not org_code:
        org_id = None
    
    user = getattr(request.state, "user", None)
    username = user["username"] if user else None
    
    print(f"\n♥️♥️♥️Requested API call with count={count}, language={language}, username={username}, org_id={org_id}, TS={translation_set_id}, Book={book_id}, Chapter={chapter_id}, Page={page_id}, Search Text={search_text}")
    # Use the same service to either choose random pictures or select a Card based on translation_set_id if provided
   
    # ts_coll = await translation_set_collection.find_one(
    #     {"set_id": translation_set_id}) if translation_set_id else None
    translation_docs = []
   
    # if ts_coll:
    if book_id and chapter_id and page_id:
        print(f"Playlist details provided: Book={book_id}, Chapter={chapter_id}, Page={page_id}. Fetching pictures from page.")
        translation_docs = await get_page_details(book_id, chapter_id, page_id, request=request, language=language, org_id=org_id)
    elif translation_set_id:
        print(f"Translation set ID provided: {translation_set_id}. Fetching pictures from this set.")
        translation_docs = await get_TS_card_details(translation_set_id)
    elif search_text:
        print(f"Search text provided: {search_text}. Fetching pictures from pool recommendations.")
        translation_docs = await get_pool_recommendations(
            search_query=search_text,
            limit=count,
            language=language or "English",
            request=request,
            org_id=org_id
        )
    else:
        print("No specific source provided. Fetching random pictures.")
        translation_docs = await get_random_picture_details(count, language, category, field_of_study, org_id)

    # continue rest of the processing from here
    logger.info(f"Retrieved {len(translation_docs)} documents from DB")

    # Check and update quiz_qa if needed for each translation
    api_quiz_qa_url = os.getenv("EXTERNAL_QUIZ_QA_URL", "http://localhost:8000/translations/update_quiz_qa")
    for doc in translation_docs:
        translation_id = doc.get("translation_id")
        quiz_qa = doc.get("quiz_qa", [])
        
        # Check if quiz_qa is missing, blank, or has fewer than 15 questions
        needs_update = False
        if not quiz_qa:  # None or empty list
            needs_update = True
            logger.info(f"Translation {translation_id} has no quiz_qa, will update")
        elif len(quiz_qa) < 15:
            needs_update = True
            logger.info(f"Translation {translation_id} has only {len(quiz_qa)} questions, will update")
        
        if needs_update:
            try:
                # Call the API to populate quiz_qa
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        f"{api_quiz_qa_url}",
                        data={"translation_id_str": str(translation_id)}
                    )
                    if response.status_code == 200:
                        logger.info(f"Successfully updated quiz_qa for translation {translation_id}")
                        # Fetch the updated document to get the new quiz_qa
                        updated_doc = await translation_collection.find_one({"_id": translation_id})
                        if updated_doc:
                            doc["quiz_qa"] = updated_doc.get("quiz_qa", [])
                    else:
                        logger.error(f"Failed to update quiz_qa for translation {translation_id}: {response.status_code}")
            except Exception as e:
                logger.error(f"Error updating quiz_qa for translation {translation_id}: {str(e)}")

    # 🔀 Randomized field mapping logic (extensible for future fields)
    # Suppose later you add more source fields, just extend this list
    candidate_fields = ["object_hint", "object_short_hint"]

    # Randomly pick 2 distinct source fields from candidates
    selected_fields = random.sample(candidate_fields, 2)

    # Fixed target slots
    target_fields = ["object_hint", "object_short_hint"]

    # Build mapping dictionary: target_field -> chosen_source_field
    mapping = dict(zip(target_fields, selected_fields))
    logger.info(f"Hint field mapping for this request: {mapping}")

    # 4) Normalize response
    return_result = []
    for d in translation_docs:
        object_id = d.get("object_id")
        if object_id:
            obj = await objects_collection.find_one({"_id": object_id})
            if obj:
                logger.debug(f"Found matching object for object_id={object_id}: {obj}")
                image_store = obj.get("image_store")
                if image_store:
                    imagebase64 = await retrieve_image(image_store)
                    print("\nFound Image in image_store..")
                else:
                    imagebase64 = obj.get("image_base64")

                api_pic = ApiPicture(
                    object=ResultObject(
                        object_id=str(object_id),
                        # image_base64=obj.get("image_base64"), # this has to be taken from AWS S3 
                        image_base64 = imagebase64,
                        image_hash=obj.get("image_hash"),
                        object_category=obj.get("metadata", {}).get("object_category"),
                    ),
                    translations=ResultTranslation(
                        translation_id=str(d.get("translation_id")),
                        language=d.get("requested_language", ""),
                        object_description=d.get("object_description", ""),
                        object_hint=d.get(mapping["object_hint"], ""),          # mapped consistently
                        object_name=d.get("object_name", ""),                  # always fixed
                        object_short_hint=d.get(mapping["object_short_hint"], ""),
                        quiz_qa=d.get("quiz_qa", [])
                    ),
                    voting=ResultVoting(
                        up_votes=d.get("up_votes", 0),
                        down_votes=d.get("down_votes", 0)
                    )
                )

                return_result.append(api_pic)

    return return_result
