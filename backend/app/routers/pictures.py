import random
import logging
from fastapi import APIRouter, Query
from typing import List, Optional
from app.database import objects_collection, translation_collection
from app.models import ApiPicture, ResultObject, ResultTranslation, ResultVoting, ResultSheet
import os
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pictures", tags=["pictures"])

@router.get("/random", response_model=List[ApiPicture])
async def get_random_pictures(
    count: int = Query(6, ge=1, le=20),
    language: Optional[str] = None   # 👈 renamed here
):
    print(f"Requested API call with count={count}, language={language}")

    load_dotenv()  # load .env file if exists  

    play_value = os.getenv("PLAY_OPTION", "object_hint")


    print(f"\nModifying picture count at backend to : {count} and using {play_value} as play option")

    
    # 1) Build base filter
    base_query = {}
    
    #Always filter by language if provided select all if not provided from Frontend.
    if language:
        base_query["requested_language"] = language
        base_query["translation_status"] = 'Approved'
        logger.info(f"Filtering by requested_language={language}")
    else:   # No language specified, fetch from all records
        logger.info("No language specified → fetching from all records")
    

    print ("\nBase query:", base_query)
    logger.info(f"Base query: {base_query}")
    print(f"Base Query: {base_query}")

    # 2) Count documents in filtered set on language and elinminate any duplicate object_ids (if available)
    # is relevant in case no language is specified
    total = await translation_collection.count_documents(base_query)
    print(f"Total documents matching base query before distinct: {total}")
    distinct_ids = await translation_collection.distinct("object_id", base_query)
    total = len(distinct_ids)
    print(f"Total distinct object_ids: {distinct_ids}")
    logger.info(f"Total documents matching filter: {total}")

    if total == 0:
        logger.warning("No documents found for given language filter")
        return []

    if total < count:
        logger.info(f"Requested {count} but only {total} available. Reducing count.")
        count = total



# Step 2: Build aggregation pipeline
    pipeline = [
        {"$match": base_query},
        # Collapse duplicates of the same object_id within this language
        {"$group": {
           "_id": {
            "object_name": "$object_name",
            
             },
            "object_id": {"$first": "$object_id"},
            "object_name": {"$first": "$object_name"},
            "object_description": {"$first": "$object_description"},
            "object_hint": {"$first": "$object_hint"},
            "object_short_hint":{"$first":"$object_short_hint"},
            "translation_id":{"$first": "$_id"},
            "up_votes":{"$first":"$up_votes"},
            "down_votes":{"$first":"$down_votes"}
        }},
        # Now sample unique objects
        {"$sample": {"size": count}},
        {"$project": {
            "_id": 1,
            "translation_id":1,
            "requested_language":1,
            "object_id": 1,
            "object_name": 1,
            "object_description": 1,
            "object_hint": 1,
            "object_short_hint":1,
            "up_votes":1,
            "down_votes":1,
            "sheet_id":1,
            "sheet_name":1,
        }}
    ]

    # logger.info(f"Aggregation pipeline: {pipeline}")

    translation_docs = await translation_collection.aggregate(pipeline).to_list(length=count)

    # print(f"translation_doc : {translation_docs[0]}")


    logger.info(f"Retrieved {len(translation_docs)} documents from DB")

    # 4) Normalize response
    return_result = []
    for d in translation_docs:
        # logger.debug(f"Processing document: {d}")
        # logger.info(f"Full translation_doc: {d}")
        # retrieve actual image, image_name etc. from objects_collection
        object_id = d.get("object_id")
        if object_id:
            obj = await objects_collection.find_one({"_id": object_id})
            if obj:
                logger.debug(f"Found matching object for object_id={object_id}: {obj}")
                
                api_pic = ApiPicture(
                    object=ResultObject(
                        object_id=str(object_id),
                        image_base64=obj.get("image_base64"),
                        image_hash=obj.get("image_hash"),
                        object_category=obj.get("metadata", {}).get("object_category"),
                    ),
                    translations=ResultTranslation(
                        translation_id=str(d.get("translation_id")),   # ✅ stringified
                        language=d.get("requested_language", ""),
                        object_description=d.get("object_description", ""),
                        # object_hint=d.get("object_hint", ""),
                        object_hint=d.get(play_value, ""),
                        object_name=d.get("object_name", ""),
                        object_short_hint=d.get("object_short_hint", ""),
                    ),
                    voting=ResultVoting(
                        up_votes=d.get("up_votes", 0),      # ✅ integer
                        down_votes=d.get("down_votes", 0)   # ✅ integer
                    )
                )


                #     sequence_number=obj.get("sequence_number"),
                #     image_name=obj.get("image_name"),
                #     image_base64=obj.get("image_base64"),
                #     result=ResultHint(
                #         object_hint_en=d.get("object_hint"),
                #         object_name_en=d.get("object_name"),
                #         object_description_en=d.get("object_description"),
                #         object_description_translated=d.get("object_description"),
                #         object_name_translated=d.get("object_name"),
                #         object_hint_translated=d.get("object_hint"),
                #         object_category=d.get("object_category")
                #     ),
                # )

 
                return_result.append(api_pic)

                # print only hint + description
                # print(f"Complete API_pic:", api_pic)

            else:
                logger.warning(f"No object found in objects_collection for object_id={object_id}")
                continue # skip if no matching object found
        else:
            logger.warning("No object_id found in translation document")
            continue # skip if no object_id
        
    return return_result
