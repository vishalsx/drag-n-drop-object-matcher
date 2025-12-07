
from bson import ObjectId
from app.database import translation_collection

async def get_TS_card_details(ts_coll: any)-> list:
    # Step 1: Fetch translation set if provided
    # ts_doc = await translation_sets_collection.find_one({"set_id": translation_set_id}) if translation_set_id else None

    translation_docs = []

    if ts_coll and ts_coll.get("image_translation_ids"):
        # Step 2: Extract list of translation IDs
        image_translation_ids = ts_coll["image_translation_ids"]

        # Convert IDs to ObjectId if they are stored as strings or ints
        object_ids = []
        for i in image_translation_ids:
            try:
                object_ids.append(ObjectId(i))
            except Exception:
                # fallback if IDs are numeric (int-based)
                object_ids.append(i)

        # Step 3: Build aggregation pipeline
        pipeline = [
            {
                "$match": {
                    "_id": {"$in": object_ids},
                    "translation_status": "Approved"
                }
            },
            {
                "$project": {
                    "_id": 0,  # exclude Mongo _id from response
                    "translation_id": "$_id",
                    "requested_language": 1,
                    "object_id": 1,
                    "object_name": 1,
                    "object_description": 1,
                    "object_hint": 1,
                    "object_short_hint": 1,
                    "quiz_qa": 1,
                    "up_votes": 1,
                    "down_votes": 1
                }
            }
        ]

        # Step 4: Execute aggregation and convert to list
        translation_docs = await translation_collection.aggregate(pipeline).to_list(length=None)

    else:
        translation_docs = []  # fallback if no set or invalid ID
    
    
    return translation_docs
