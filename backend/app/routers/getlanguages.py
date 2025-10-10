from fastapi import HTTPException, APIRouter
from fastapi.responses import JSONResponse
from app.database import translation_collection, languages_collection, objects_collection
from bson import ObjectId

# ---------- Initialize FastAPI ----------
router = APIRouter(prefix="/active", tags=["Language, Objects category and Field of Study Services"])

# ---------- API endpoint ----------
@router.get("/languages")
async def get_languages():
    try:
        # 1️⃣ Get distinct languages from translations collection
        # distinct_lang_texts = await translation_collection.distinct("requested_language")
        distinct_lang_texts = await translation_collection.distinct(
            "requested_language",
            {"translation_status": "Approved"}  # Filter condition added here ✅
        )

        print("\nDistinct languages found:", distinct_lang_texts)
        if not distinct_lang_texts:
            return JSONResponse(content=[])

        # 2️⃣ Query languages collection for matching details
        cursor = languages_collection.find(
            {"language_name": {"$in": distinct_lang_texts}},
            {"_id": 0, "language_name": 1, "isoCode": 1, "bcp47": 1, "imageURL": 1}
        )

        raw_languages = await cursor.to_list(length=None)

        # Normalize field names for frontend
        languages = [
            {
                "name": lang.get("language_name"),
                "code": lang.get("isoCode"),
                "bcp47": lang.get("bcp47"),
                "imageURL": lang.get("imageURL")
            }
            for lang in raw_languages
        ]

        print("\nLanguages details fetched:", languages)
        return JSONResponse(content=languages)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch languages: {str(e)}")



@router.get("/object-categories-FOS/{language}")
async def get_object_categories_FOS(language: str):
    try:
        # 1️⃣ Fetch all object_ids for the specified language and approved translations
        object_ids = await translation_collection.distinct(
            "object_id",
            {"requested_language": language, "translation_status": "Approved"}
        )
        print(f"\nApproved object_ids for language '{language}':", object_ids)

        if not object_ids:
            return JSONResponse(content={"object_categories": [], "fields_of_study": []})

        # 2️⃣ Convert valid object_ids to ObjectId type for MongoDB query
        valid_object_ids = [ObjectId(obj_id) for obj_id in object_ids if ObjectId.is_valid(obj_id)]

        # 3️⃣ Query objects collection to fetch only 'Approved' images and their metadata fields
        cursor = objects_collection.find(
            {
                "_id": {"$in": valid_object_ids},
                "image_status": "Approved"   # ✅ New condition added
            },
            {
                "_id": 0,
                "metadata.object_category": 1,
                "metadata.field_of_study": 1
            }
        )
        raw_objects = await cursor.to_list(length=None)

        # 4️⃣ Extract distinct categories and fields of study
        object_categories = sorted({
            obj.get("metadata", {}).get("object_category")
            for obj in raw_objects
            if obj.get("metadata", {}).get("object_category")
        })

        fields_of_study = sorted({
            obj.get("metadata", {}).get("field_of_study")
            for obj in raw_objects
            if obj.get("metadata", {}).get("field_of_study")
        })

        print(f"\nFiltered object categories: {object_categories}")
        print(f"Filtered fields of study: {fields_of_study}")

        # 5️⃣ Return the results
        return JSONResponse(content={
            "object_categories": object_categories,
            "fields_of_study": fields_of_study
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch object categories: {str(e)}")
