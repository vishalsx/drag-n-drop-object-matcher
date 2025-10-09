from fastapi import HTTPException, APIRouter
from fastapi.responses import JSONResponse
from app.database import translation_collection, languages_collection

# ---------- Initialize FastAPI ----------
router = APIRouter(prefix="/active", tags=["Languages Service"])

# ---------- API endpoint ----------
@router.get("/languages")
async def get_languages():
    try:
        # 1️⃣ Get distinct languages from translations collection
        distinct_lang_texts = await translation_collection.distinct("requested_language")
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
