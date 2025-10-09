from app.database import translation_collection
import logging


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_random_picture_details(count: int, language: str) -> list:
        

    # load_dotenv()  # load .env file if exists  

    # play_value = os.getenv("PLAY_OPTION", "object_hint")


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
            # "sheet_id":1,
            # "sheet_name":1,
        }}
    ]

    # logger.info(f"Aggregation pipeline: {pipeline}")

    translation_docs = await translation_collection.aggregate(pipeline).to_list(length=count)
    
    return translation_docs
