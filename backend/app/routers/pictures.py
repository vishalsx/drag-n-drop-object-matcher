import random
import logging
from fastapi import APIRouter, Query
from typing import List, Optional
from app.database import objects_collection, translation_set_collection
from app.models import ApiPicture, ResultObject, ResultTranslation, ResultVoting
import os
# from dotenv import load_dotenv
from app.storage.imagestore import retrieve_image  
from app.services.TScarddetails import get_TS_card_details
from app.services.randompicdetails import get_random_picture_details

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pictures", tags=["pictures"])

@router.get("/random", response_model=List[ApiPicture])
async def get_random_pictures(
    count: int = Query(6, ge=1, le=20, description="Number of random pictures to fetch"),
    language: Optional[str] = Query(None, description="Language filter for pictures"),
    category: Optional[str] = Query(None, description="Object category filter"),
    field_of_study: Optional[str] = Query(None, description="Field of study filter"),
    translation_set_id: Optional[str] = Query(None, description="Optional translation set ID to pick pictures from"),
):
    # Use the same service to either choose random pictures or select a Card based on translation_set_id if provided
    ts_coll = translation_set_collection.findOne({"set_id": translation_set_id}) if translation_set_id else None
    translation_docs = []
    if ts_coll:
        print(f"Translation set ID provided: {translation_set_id}. Fetching pictures from this set.")
        translation_docs = await get_TS_card_details(ts_coll)
    else:
        print("No translation set ID provided. Fetching random pictures.")
        print(f"Requested API call with count={count}, language={language}")
        translation_docs = await get_random_picture_details(count, language, category, field_of_study)

    # continue rest of the processing from here
    logger.info(f"Retrieved {len(translation_docs)} documents from DB")

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
                        object_short_hint=d.get(mapping["object_short_hint"], "")
                    ),
                    voting=ResultVoting(
                        up_votes=d.get("up_votes", 0),
                        down_votes=d.get("down_votes", 0)
                    )
                )

                return_result.append(api_pic)

    return return_result
