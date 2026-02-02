from fastapi import HTTPException, APIRouter, Request
from fastapi.responses import JSONResponse
from app.database import translation_collection, languages_collection, objects_collection
from bson import ObjectId
# from googletrans import Translator
# from deep_translator import GoogleTranslator
from app.database import organisations_collection
import json
import os
from app.redis_connection import redis_client, TTS_CACHE_TTL  # ✅ reuse TTL for cache
import logging
from googleapiclient.discovery import build
from starlette.concurrency import run_in_threadpool


logger = logging.getLogger(__name__)

# ---------- Initialize FastAPI ----------
router = APIRouter(prefix="/active", tags=["Language, Objects category and Field of Study Services"])
# translator = Translator()

async def get_language_code(language_name: str) -> str:
    """Map language names to ISO 639-1 codes using the languages collection."""
    if not language_name:
        return "en"
    
    clean_name = language_name.strip().title() # DB uses Title Case (e.g., "Hindi")
    try:
        lang_doc = await languages_collection.find_one({"language_name": clean_name})
        if lang_doc and lang_doc.get("isoCode"):
            return lang_doc["isoCode"]
        
        # Fallback to first 2 letters if not found in DB
        return language_name.strip().lower()[:2]
    except Exception as e:
        logger.warning(f"⚠️ Error fetching language code for {language_name}: {e}")
        return language_name.strip().lower()[:2]

async def translate_text(text: str, target_language: str) -> str:
    """Translate text to target language using Google Translate API."""
    if not text or not target_language:
        return text
    
    try:
        api_key = os.getenv("GOOGLE_API_KEY") # Use the same key as others
        if not api_key:
            logger.error("❌ GOOGLE_API_KEY not found in environment.")
            return text
            
        service = build('translate', 'v2', developerKey=api_key,cache_discovery=False)
        
        target_code = await get_language_code(target_language)
        
        result = await run_in_threadpool(
            service.translations().list(
                q=[text],
                target=target_code
            ).execute
        )
        
        if result and 'translations' in result:
            return result['translations'][0]['translatedText']
        
        return text
    except Exception as e:
        logger.warning(f"⚠️ Google Translation failed for '{text}' to {target_language}: {e}")
        return text

# ---------- API endpoint ----------
@router.get("/languages")
async def get_languages(request: Request):
    try:
        org = getattr(request.state, "org", None)
        user = getattr(request.state, "user", None)
        
        final_languages = set()
        if user:
            print("\nUser:", user)

        if org:
            # Step 1: Org Logic
            org_id = org.get("org_id")
            
            # Check for languages_allowed at top level (per model) or under settings (fallback)
            # Support both "languages_allowed" and "language_allowed"
            org_allowed = org.get("languages_allowed") or org.get("language_allowed")
            if org_allowed is None:
                settings = org.get("settings", {})
                org_allowed = settings.get("languages_allowed") or settings.get("language_allowed")

            print(f"\nFor Org id: {org_id} | Org allowed languages: {org_allowed}")
            
            # Find languages in translations where org_id matches and status is Approved
            available_in_db = await translation_collection.distinct(
                "requested_language",
                {"org_id": org_id, "translation_status": "Approved"}
            )
            
            # Intersect Org Allowed (if defined) with Available in DB
            if org_allowed is not None:
                step1_langs = set(org_allowed) & set(available_in_db)
            else:
                # If no restriction is defined on the Org, show all approved translated languages
                step1_langs = set(available_in_db)

            # Step 2: User Logic (if logged in and the Org is Private)
            # Requirement: Public or global contexts should show all available org-level languages 
            # even for logged-in users. Filtering only applies in Private Org context.
            is_public_org = str(org.get("org_type", "")).lower() == "public"
            
            if user and not is_public_org:
                print(f"\nPrivate Org context: Applying user-specific filters for {user.get('username') or user.get('sub')}")
                user_allowed = user.get("languages_allowed") # List[str] or None
                username = user.get("username") or user.get("sub") or user.get("user_id")
                print (f"\nUser allowed languages: {user_allowed}, for user id {username}")
                
                if user_allowed is not None:
                    # Intersect Step 1 with User Allowed
                    final_languages = step1_langs & set(user_allowed)
                    print (f"\nFinal languages after intersection: {final_languages}")
                else:
                    # If languages_allowed is missing from token, default to empty set for private orgs
                    print("\nWarning: 'languages_allowed' not found in user token for private org. Defaulting to empty set.")
                    final_languages = set()
            else:
                if user and is_public_org:
                    print("\nPublic Org detected. Bypassing user-specific language filtering.")
                final_languages = step1_langs # Take all org level languages
                
        else:
            # Step 3: No Org
            # Select distinct languages where org_id is null or not present
            final_languages = await translation_collection.distinct(
                "requested_language",
                {
                    "translation_status": "Approved",
                    "$or": [{"org_id": {"$exists": False}}, {"org_id": None}]
                }
            )
            final_languages = set(final_languages)

        distinct_lang_texts = list(final_languages)

        print("\nDistinct languages found:", distinct_lang_texts)
        if not distinct_lang_texts:
            return JSONResponse(content=[])

        # 2️⃣ Query languages collection for matching details
        cursor = languages_collection.find(
            {"language_name": {"$in": distinct_lang_texts}},
            {"_id": 0, "language_name": 1, "isoCode": 1, "bcp47": 1, "imageURL": 1}
        )

        raw_languages = await cursor.to_list(length=None)
        print("\n⏰⏰⏰Raw languages fetched:", raw_languages)
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
        # Sort languages alphabetically by name
        sorted_languages = sorted(languages, key=lambda x: x['name'] if x['name'] else "")
        return JSONResponse(content=sorted_languages)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch languages: {str(e)}")

@router.get("/object-categories-FOS/{language_name}") #FOS - field of study
async def get_object_categories_FOS(language_name: str, request: Request, refresh: bool = False):
    try:
        # 1️⃣ Get ISO code for the requested language
        language_doc = await languages_collection.find_one(
            {"language_name": {"$regex": f"^{language_name}$", "$options": "i"}},
            {"_id": 0, "isoCode": 1}
        )
        lang_code = language_doc.get("isoCode", "en") if language_doc else "en"

        # Get Org ID
        org = getattr(request.state, "org", None)
        org_id = org.get("org_id") if org else None
        
        # ✅ Create Redis cache key (include org_id to separate caches)
        org_suffix = f"org:{org_id}" if org_id else "public"
        cache_key = f"categories_fos:{lang_code.lower()}:{org_suffix}"

        # 2️⃣ Try fetching cached translation from Redis if not refreshing
        if not refresh:
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    logger.info(f"✅ Cache hit for {lang_code} ({org_suffix})")
                    return JSONResponse(content=json.loads(cached_data))
            except Exception as e:
                logger.warning(f"Redis fetch failed: {e}")
        else:
            logger.info(f"🔄 Refresh requested for {lang_code} ({org_suffix}). Bypassing cache.")

        # 3️⃣ Fetch all approved translation object_ids
        query = {"requested_language": language_name.title(), "translation_status": "Approved"}
        
        if org_id:
            query["org_id"] = org_id
        else:
            # If no org_id, fetch public translations (org_id is null or missing)
            query["$or"] = [{"org_id": {"$exists": False}}, {"org_id": None}]

        object_ids = await translation_collection.distinct("object_id", query)

        object_categories = []
        fields_of_study = []

        if not object_ids:
            # Fallback Logic: Fetch categories and FOS from all approved objects for this org/public
            obj_query = {"image_status": "Approved"}
            if org_id:
                obj_query["org_id"] = org_id
            else:
                obj_query["$or"] = [{"org_id": {"$exists": False}}, {"org_id": None}]
            
            raw_categories = await objects_collection.distinct("metadata.object_category", obj_query)
            raw_fos = await objects_collection.distinct("metadata.field_of_study", obj_query)
            
            object_categories = sorted([c for c in raw_categories if c])
            fields_of_study = sorted([f for f in raw_fos if f])
        else:
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

        translated_object_categories = []
        translated_fields_of_study = []

        # 6️⃣ If English, no translation needed
        if lang_code.lower() in ["en", "eng"]:
            translated_object_categories = [{"en": cat, "translated": cat} for cat in object_categories]
            translated_fields_of_study = [{"en": field, "translated": field} for field in fields_of_study]
        else:
            for cat in object_categories:
                translated_text = await translate_text(cat, language_name)
                translated_object_categories.append({"en": cat, "translated": translated_text})

            for field in fields_of_study:
                translated_text = await translate_text(field, language_name)
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