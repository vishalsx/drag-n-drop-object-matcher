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
    field_of_study: Optional[str] = None,
    org_id: Optional[str] = None,
    object_ids: Optional[list] = None
) -> list:
    """
    Fetch random picture translations filtered by:
    - requested_language (if provided)
    - translation_status == 'Approved'
    - objects.metadata.image_status == 'Approved'
    - objects.metadata.object_category OR objects.metadata.field_of_study
    - org_id (if provided)
    - object_ids (if provided, filters to specific objects)
    Deduplication is done on object_name (not object_id).
    """
  
    # if org_id:
    #     base_query["org_id"] = org_id

    # 1) Initialize base queries
    base_query = {"translation_status": "Approved"}
    object_filter = {"image_status": "Approved"}
    print(f"\n⏰ Inside get_random_picture_details: Requested language: {language}, Org ID: {org_id}")
    # 2) Apply Org ID logic
    if org_id:
        # Case 1: org_id provided
        object_filter["$or"] = [ # this is for objects collection
            {"org_id": org_id},
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""},
        ]
        base_query["org_id"] = org_id  # this is for translations collection
    else:
        # Case 2: no org_id provided
        object_filter["$or"] = [ # this is for objects collection
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""},
        ]
        base_query["$or"] = [ # this is for translations collection
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""},
        ]

    # 3) Apply Language filter
    if language:
        base_query["requested_language"] = language
        logger.info(f"Filtering by requested_language={language}")
    else:
        logger.info("No language specified → fetching from all records")
  
    # 4) Apply Category/FOS filter
    if category:
        object_filter["metadata.object_category"] = category
    elif field_of_study:
        object_filter["metadata.field_of_study"] = field_of_study

    # # 3) Get all matching object _ids (ObjectId type)
    # matching_object_ids = await objects_collection.distinct("_id", object_filter)
    # print(f"\nFound {len(matching_object_ids)} matching objects")

    # if not matching_object_ids:
    #     logger.warning("No objects found matching the provided filters.")
    #     return []

    # # 4) Restrict translation query to those object IDs (ObjectId type)
    # base_query["object_id"] = {"$in": matching_object_ids}

    # # 5) Count distinct object_names after filters
    # distinct_names = await translation_collection.distinct("object_name", base_query)
    # total = len(distinct_names)
    # print("\nTotal distinct object_names after filters: ", total, distinct_names)
    # logger.info(f"Total distinct object_names after filters: {total}")

  
  
    # 2.5) Apply object_ids filter if provided
    if object_ids:
        base_query["object_id"] = {"$in": object_ids}
        object_filter["_id"] = {"$in": object_ids}
        logger.info(f"Filtering matching matching objects by explicit ID list: {len(object_ids)} IDs")
    print("\n^^^^^^^^^^base_query: ", base_query)
    print("\n^^^^^^^^^^object_filter: ", object_filter)
    # 3) Get all matching object _ids (ObjectId type)
    # Retrieving translations based on either (org_id + language) or (no org_id + language) as per the base query
    translations_object_ids = await translation_collection.distinct("object_id", base_query) 
    print(f"\n----Found {len(translations_object_ids)} matching translations")
 
    # 4) Get all objects collections _ids based on translation_object_ids
    if object_ids:
         object_filter["_id"] = {"$in": [oid for oid in translations_object_ids if oid in object_ids]}
    else:
         object_filter["_id"] = {"$in": translations_object_ids}
    
    print(f"\n----Filtering objects based on translation_object_ids: {object_filter}")

    matching_object_ids = await objects_collection.distinct("_id", object_filter)
    print(f"\nFound {len(matching_object_ids)} matching objects")

    if not matching_object_ids:
        logger.warning("No objects found matching the provided filters.")
        return []

    # 4) Restrict translation query to those object IDs (ObjectId type)
    base_query["object_id"] = {"$in": matching_object_ids}
    print(f"\n----Restricting translation query to those object IDs: {base_query}")

    # 5) Count distinct items after filters
    if object_ids:
        # When specific IDs are requested, we deduplicate by object_id to ensure we get exactly what was asked for
        distinct_items = await translation_collection.distinct("object_id", base_query)
    else:
        # For random matching, we still deduplicate by object_name to provide variety
        distinct_items = await translation_collection.distinct("object_name", base_query)

    total = len(distinct_items)
    print("\nTotal distinct items after filters: ", total)
    logger.info(f"Total distinct items after filters: {total}")




    if total == 0:
        logger.warning("No translation documents found for given filters.")
        return []

    if total < count:
        logger.info(f"Requested {count} but only {total} available. Reducing count.")
        count = total

    # 6) Aggregation: deduplicate → sample randomly
    # Grouping key depends on whether we are replaying specific objects or fetching random ones
    group_key = "$object_id" if object_ids else "$object_name"

    pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": group_key,               # deduplicate by object_id if replaying, else by object_name
            "object_id": {"$first": "$object_id"},
            "object_name": {"$first": "$object_name"},
            "object_description": {"$first": "$object_description"},
            "object_hint": {"$first": "$object_hint"},
            "object_short_hint": {"$first": "$object_short_hint"},
            "quiz_qa": {"$first": "$quiz_qa"},
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
            "quiz_qa": 1,
            "up_votes": 1,
            "down_votes": 1,
        }}
    ]

    translation_docs = await translation_collection.aggregate(pipeline).to_list(length=count)
    logger.info(f"Fetched {len(translation_docs)} random documents")

    return translation_docs
