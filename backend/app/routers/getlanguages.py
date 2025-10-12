from fastapi import HTTPException, APIRouter
from fastapi.responses import JSONResponse
from app.database import translation_collection, languages_collection, objects_collection
from bson import ObjectId
from googletrans import Translator
import json
from app.redis_connection import redis_client, TTS_CACHE_TTL  # ✅ reuse TTL for cache
import logging


logger = logging.getLogger(__name__)

# ---------- Initialize FastAPI ----------
router = APIRouter(prefix="/active", tags=["Language, Objects category and Field of Study Services"])
translator = Translator()

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



# @router.get("/object-categories-FOS/{language}")
# async def get_object_categories_FOS(language: str):
#     try:
#         # 1️⃣ Fetch all object_ids for the specified language and approved translations
#         object_ids = await translation_collection.distinct(
#             "object_id",
#             {"requested_language": language.title(), "translation_status": "Approved"}
#         )
#         # print(f"\nApproved object_ids for language '{language}':", object_ids)

#         if not object_ids:
#             return JSONResponse(content={"object_categories": [], "fields_of_study": []})

#         # 2️⃣ Convert valid object_ids to ObjectId type for MongoDB query
#         valid_object_ids = [ObjectId(obj_id) for obj_id in object_ids if ObjectId.is_valid(obj_id)]

#         # 3️⃣ Query objects collection to fetch only 'Approved' images and their metadata fields
#         cursor = objects_collection.find(
#             {
#                 "_id": {"$in": valid_object_ids},
#                 "image_status": "Approved"   # ✅ New condition added
#             },
#             {
#                 "_id": 0,
#                 "metadata.object_category": 1,
#                 "metadata.field_of_study": 1
#             }
#         )
#         raw_objects = await cursor.to_list(length=None)

#         # 4️⃣ Extract distinct categories and fields of study
#         object_categories = sorted({
#             obj.get("metadata", {}).get("object_category")
#             for obj in raw_objects
#             if obj.get("metadata", {}).get("object_category")
#         })

#         fields_of_study = sorted({
#             obj.get("metadata", {}).get("field_of_study")
#             for obj in raw_objects
#             if obj.get("metadata", {}).get("field_of_study")
#         })

#         print(f"\nFiltered object categories: {object_categories}")
#         print(f"Filtered fields of study: {fields_of_study}")

#         # convert the items in both lists to the sent language of not English.
#         if language.lower() != "english":
#                 pass

#         # 5️⃣ Return the results
#         return JSONResponse(content={
#             "object_categories": object_categories,
#             "fields_of_study": fields_of_study
#         })

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to fetch object categories: {str(e)}")


# @router.get("/object-categories-FOS/{language_name}")
# async def get_object_categories_FOS(language_name: str):
#     try:
#         # 1️⃣ Get the ISO code for the requested language name
#         language_doc = await languages_collection.find_one(
#             {"language_name": {"$regex": f"^{language_name}$", "$options": "i"}},
#             {"_id": 0, "isoCode": 1}
#         )
#         if not language_doc:
#             raise HTTPException(status_code=404, detail=f"Language '{language_name}' not found in database.")

#         lang_code = language_doc.get("isoCode", "en")

#         # 2️⃣ Fetch all object_ids for this language and approved translations
#         object_ids = await translation_collection.distinct(
#             "object_id",
#             {"requested_language": language_name.title(), "translation_status": "Approved"}
#         )

#         if not object_ids:
#             return JSONResponse(content={"object_categories": [], "fields_of_study": []})

#         # 3️⃣ Convert valid object_ids to ObjectId type for MongoDB query
#         valid_object_ids = [ObjectId(obj_id) for obj_id in object_ids if ObjectId.is_valid(obj_id)]

#         # 4️⃣ Query objects collection for approved objects
#         cursor = objects_collection.find(
#             {
#                 "_id": {"$in": valid_object_ids},
#                 "image_status": "Approved"
#             },
#             {
#                 "_id": 0,
#                 "metadata.object_category": 1,
#                 "metadata.field_of_study": 1
#             }
#         )
#         raw_objects = await cursor.to_list(length=None)

#         # 5️⃣ Extract distinct categories and fields of study
#         object_categories = sorted({
#             obj.get("metadata", {}).get("object_category")
#             for obj in raw_objects
#             if obj.get("metadata", {}).get("object_category")
#         })

#         fields_of_study = sorted({
#             obj.get("metadata", {}).get("field_of_study")
#             for obj in raw_objects
#             if obj.get("metadata", {}).get("field_of_study")
#         })

#         # 6️⃣ If language is English, return as-is
#         if lang_code.lower() in ["en", "eng"]:
#             translated_object_categories = [{"en": cat, "translated": cat} for cat in object_categories]
#             translated_fields_of_study = [{"en": field, "translated": field} for field in fields_of_study]
#         else:
#             # 7️⃣ Translate using googletrans (graceful fallback if fails)
#             translated_object_categories = []
#             translated_fields_of_study = []

#             for cat in object_categories:
#                 try:
#                     translated_text = translator.translate(cat, src="en", dest=lang_code).text
#                 except Exception as e:
#                     print(f"⚠️ Translation failed for category '{cat}': {e}")
#                     translated_text = cat
#                 translated_object_categories.append({"en": cat, "translated": translated_text})

#             for field in fields_of_study:
#                 try:
#                     translated_text = translator.translate(field, src="en", dest=lang_code).text
#                 except Exception as e:
#                     print(f"⚠️ Translation failed for field '{field}': {e}")
#                     translated_text = field
#                 translated_fields_of_study.append({"en": field, "translated": translated_text})

#         # 8️⃣ Return structured response
#         return JSONResponse(content={
#             "object_categories": translated_object_categories,
#             "fields_of_study": translated_fields_of_study
#         })

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to fetch object categories: {str(e)}")

@router.get("/object-categories-FOS/{language_name}")
async def get_object_categories_FOS(language_name: str):
    try:
        # 1️⃣ Get ISO code for the requested language
        language_doc = await languages_collection.find_one(
            {"language_name": {"$regex": f"^{language_name}$", "$options": "i"}},
            {"_id": 0, "isoCode": 1}
        )
        if not language_doc:
            raise HTTPException(status_code=404, detail=f"Language '{language_name}' not found in database.")

        lang_code = language_doc.get("isoCode", "en")

        # ✅ Create Redis cache key
        cache_key = f"categories_fos:{lang_code.lower()}"

        # 2️⃣ Try fetching cached translation from Redis (Upstash is sync)
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                logger.info(f"✅ Cache hit for {lang_code}")
                return JSONResponse(content=json.loads(cached_data))
        except Exception as e:
            logger.warning(f"Redis fetch failed: {e}")

        # 3️⃣ Fetch all approved translation object_ids
        object_ids = await translation_collection.distinct(
            "object_id",
            {"requested_language": language_name.title(), "translation_status": "Approved"}
        )

        if not object_ids:
            return JSONResponse(content={"object_categories": [], "fields_of_study": []})

        valid_object_ids = [ObjectId(obj_id) for obj_id in object_ids if ObjectId.is_valid(obj_id)]

        # 4️⃣ Query MongoDB objects
        cursor = objects_collection.find(
            {
                "_id": {"$in": valid_object_ids},
                "image_status": "Approved"
            },
            {
                "_id": 0,
                "metadata.object_category": 1,
                "metadata.field_of_study": 1
            }
        )
        raw_objects = await cursor.to_list(length=None)

        # 5️⃣ Extract unique categories and fields
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

        # 6️⃣ If English, no translation needed
        if lang_code.lower() in ["en", "eng"]:
            translated_object_categories = [{"en": cat, "translated": cat} for cat in object_categories]
            translated_fields_of_study = [{"en": field, "translated": field} for field in fields_of_study]
        else:
            translated_object_categories = []
            translated_fields_of_study = []

            for cat in object_categories:
                try:
                    translated_text = translator.translate(cat, src="en", dest=lang_code).text
                except Exception as e:
                    logger.warning(f"⚠️ Translation failed for category '{cat}': {e}")
                    translated_text = cat
                translated_object_categories.append({"en": cat, "translated": translated_text})

            for field in fields_of_study:
                try:
                    translated_text = translator.translate(field, src="en", dest=lang_code).text
                except Exception as e:
                    logger.warning(f"⚠️ Translation failed for field '{field}': {e}")
                    translated_text = field
                translated_fields_of_study.append({"en": field, "translated": translated_text})

        response_data = {
            "object_categories": translated_object_categories,
            "fields_of_study": translated_fields_of_study
        }

        # 7️⃣ Store result in Redis (no await, sync call)
        try:
            redis_client.set(cache_key, json.dumps(response_data), ex=TTS_CACHE_TTL)
            logger.info(f"✅ Cached result for {lang_code}")
        except Exception as e:
            logger.warning(f"Redis cache store failed: {e}")

        # 8️⃣ Return structured response
        return JSONResponse(content=response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch object categories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch object categories: {str(e)}")