# from app.database import translation_collection
# import logging


# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# async def get_random_picture_details(count: int, language: str) -> list:
        

#     # load_dotenv()  # load .env file if exists  

#     # play_value = os.getenv("PLAY_OPTION", "object_hint")


#     # 1) Build base filter
#     base_query = {}
    
#     #Always filter by language if provided select all if not provided from Frontend.
#     if language:
#         base_query["requested_language"] = language
#         base_query["translation_status"] = 'Approved'
#         logger.info(f"Filtering by requested_language={language}")
#     else:   # No language specified, fetch from all records
#         logger.info("No language specified → fetching from all records")
    

#     print ("\nBase query:", base_query)
#     logger.info(f"Base query: {base_query}")
#     print(f"Base Query: {base_query}")

#     # 2) Count documents in filtered set on language and elinminate any duplicate object_ids (if available)
#     # is relevant in case no language is specified
#     total = await translation_collection.count_documents(base_query)
#     print(f"Total documents matching base query before distinct: {total}")
#     distinct_ids = await translation_collection.distinct("object_id", base_query)
#     total = len(distinct_ids)
#     print(f"Total distinct object_ids: {distinct_ids}")
#     logger.info(f"Total documents matching filter: {total}")

#     if total == 0:
#         logger.warning("No documents found for given language filter")
#         return []

#     if total < count:
#         logger.info(f"Requested {count} but only {total} available. Reducing count.")
#         count = total

#     # Step 2: Build aggregation pipeline
#     pipeline = [
#         {"$match": base_query},
#         # Collapse duplicates of the same object_id within this language
#         {"$group": {
#         "_id": {
#             "object_name": "$object_name",
            
#             },
#             "object_id": {"$first": "$object_id"},
#             "object_name": {"$first": "$object_name"},
#             "object_description": {"$first": "$object_description"},
#             "object_hint": {"$first": "$object_hint"},
#             "object_short_hint":{"$first":"$object_short_hint"},
#             "translation_id":{"$first": "$_id"},
#             "up_votes":{"$first":"$up_votes"},
#             "down_votes":{"$first":"$down_votes"}
#         }},
#         # Now sample unique objects
#         {"$sample": {"size": count}},
#         {"$project": {
#             "_id": 1,
#             "translation_id":1,
#             "requested_language":1,
#             "object_id": 1,
#             "object_name": 1,
#             "object_description": 1,
#             "object_hint": 1,
#             "object_short_hint":1,
#             "up_votes":1,
#             "down_votes":1,
#             # "sheet_id":1,
#             # "sheet_name":1,
#         }}
#     ]

#     # logger.info(f"Aggregation pipeline: {pipeline}")

#     translation_docs = await translation_collection.aggregate(pipeline).to_list(length=count)
    
#     return translation_docs

from app.database import translation_collection, objects_collection
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_random_picture_details(
    count: int,
    language: Optional[str] = None,
    category: Optional[str] = None,
    field_of_study: Optional[str] = None
) -> list:
    """
    Fetch random picture translations filtered by:
    - requested_language (if provided)
    - translation_status == 'Approved'
    - objects.metadata.image_status == 'Approved'
    - objects.metadata.object_category OR objects.metadata.field_of_study (based on frontend input)
    Deduplication is done on object_name (not object_id).
    """

    # 1) Build base translation query
    base_query = {"translation_status": "Approved"}
    if language:
        base_query["requested_language"] = language
        logger.info(f"Filtering by requested_language={language}")
    else:
        logger.info("No language specified → fetching from all records")
    logger.info(f"Base query: {base_query}")

    # 2) Build filter for objects_collection
    object_filter = {"image_status": "Approved"}
    if category:
        object_filter["metadata.object_category"] = category
        logger.info(f"Filtering objects by object_category={category}")
    elif field_of_study:
        object_filter["metadata.field_of_study"] = field_of_study
        logger.info(f"Filtering objects by field_of_study={field_of_study}")

    # 3) Get all matching object _ids (ObjectId type)
    matching_object_ids = await objects_collection.distinct("_id", object_filter)
    logger.info(f"Found {len(matching_object_ids)} matching objects")

    if not matching_object_ids:
        logger.warning("No objects found matching the provided filters.")
        return []

    # 4) Restrict translation query to those object IDs (ObjectId type)
    base_query["object_id"] = {"$in": matching_object_ids}

    # 5) Count distinct object_names after filters
    distinct_names = await translation_collection.distinct("object_name", base_query)
    total = len(distinct_names)
    logger.info(f"Total distinct object_names after filters: {total}")

    if total == 0:
        logger.warning("No translation documents found for given filters.")
        return []

    if total < count:
        logger.info(f"Requested {count} but only {total} available. Reducing count.")
        count = total

    # 6) Aggregation: deduplicate by object_name → sample randomly
    pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": "$object_name",               # deduplicate by object_name
            "object_id": {"$first": "$object_id"},
            "object_name": {"$first": "$object_name"},
            "object_description": {"$first": "$object_description"},
            "object_hint": {"$first": "$object_hint"},
            "object_short_hint": {"$first": "$object_short_hint"},
            "translation_id": {"$first": "$_id"},
            "up_votes": {"$first": "$up_votes"},
            "down_votes": {"$first": "$down_votes"},
            "requested_language": {"$first": "$requested_language"},
        }},
        {"$sample": {"size": count}},
        {"$project": {
            "_id": 0,
            "translation_id": 1,
            "requested_language": 1,
            "object_id": 1,
            "object_name": 1,
            "object_description": 1,
            "object_hint": 1,
            "object_short_hint": 1,
            "up_votes": 1,
            "down_votes": 1,
        }}
    ]

    translation_docs = await translation_collection.aggregate(pipeline).to_list(length=count)
    logger.info(f"Fetched {len(translation_docs)} random documents")

    return translation_docs
