import google.generativeai as genai
import os
import re
import logging
import random
from typing import List, Optional
from dotenv import load_dotenv
from app.database import translation_collection
from app.routers.languages import get_language_code, translate_text

load_dotenv()
# Configure logging
logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/gemini-embedding-001")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not found in environment variables")





def get_text_embedding(text: str) -> Optional[List[float]]:
    """Fetch embedding vector from Gemini API."""
    if not text:
        return None
    try:
        resp = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text
        )
        return resp.get("embedding")
    except Exception as e:
        logger.error(f"❌ Embedding generation failed: {e}")
        return None

async def get_vector_search_results(
    count: int,
    search_text: str,
    language: Optional[str] = None,
    org_id: Optional[str] = None
) -> list:
    """
    Perform vector search using search_text on translation_collection.
    Matches embedding_vector of translations.
    """
    logger.info(f"Performing vector search for '{search_text}' in language '{language}'")
    
    # Translate search text to requested language if language is provided
    # Source language is unknown, so we ensure query and index match by translating.
    if language:
        logger.info(f"Translating search_text to {language}")
        actual_search_text = await translate_text(search_text, language)
    else:
        actual_search_text = search_text

    # 1. Generate embedding for the search text
    query_vector = get_text_embedding(actual_search_text)
    
    if not query_vector:
        logger.warning("Failed to generate embedding for search text. Returning empty list.")
        return []

    # 2. Build Filter query
    # We want to filter by org_id (if present), language (if present), and approved status
    filter_query = {
        "translation_status": "Approved"
    }
    
    if language:
        filter_query["requested_language"] = language
        
    if org_id:
        filter_query["org_id"] = org_id
    else:
        # If no org_id, we usually want public content (org_id missing or null)
        filter_query["$or"] = [
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""}
        ]

    # Get threshold from env
    threshold = float(os.getenv("SIMILARITY_THRESHOLD", 0.7))

    # 3. Vector Search Pipeline
    # PRE-FILTERING (Preferred): Restores 'filter' inside $vectorSearch for better randomization.
    # FALLBACK: If the index isn't updated, we catch the "Path needs to be indexed as filter" error
    # and retry with post-filtering.
    
    def get_pipeline(use_pre_filter: bool):
        # If pre-filtering is enabled, a pool of 1000 is usually enough.
        # If we fall back to post-filtering, we increase the pool to 5000
        # to ensure that we find enough relevant results for the requested language.
        pool_size = 5000 if use_pre_filter else 10000
        
        vs_stage = {
            "index": "translations_vector_index",
            "path": "embedding_vector",
            "queryVector": query_vector,
            "numCandidates": pool_size, 
            "limit": pool_size,
        }
        
        if use_pre_filter:
            vs_stage["filter"] = filter_query
            
        stages = [{"$vectorSearch": vs_stage}]
        
        # Add post-filter match if not pre-filtering
        if not use_pre_filter:
            stages.append({"$match": filter_query})
            
        # Add filtering by score threshold and sampling
        stages.extend([
            {
                 "$addFields": { 
                     "score": {"$meta": "vectorSearchScore"} 
                 }
            },
            {
                "$match": { 
                    "score": {"$gte": threshold} 
                }
            },
            {
                "$sample": {"size": count} # Pick random items from the candidate pool
            },
            {
                "$project": {
                    "_id": 0,
                    "translation_id": "$_id",
                    "requested_language": 1,
                    "object_id": 1,
                    "object_name": 1,
                    "object_description": 1,
                    "object_hint": 1,
                    "object_short_hint": 1,
                    "quiz_qa": 1,
                    "up_votes": 1,
                    "down_votes": 1,
                    "score": 1
                }
            }
        ])
        return stages

    try:
        # Step A: Try with efficient Pre-Filtering
        pipeline = get_pipeline(use_pre_filter=True)
        results = await translation_collection.aggregate(pipeline).to_list(length=count)
    except Exception as e:
        error_msg = str(e)
        if "needs to be indexed as filter" in error_msg:
            logger.warning(f"⚠️ Pre-filtering failed (index not updated). Falling back to post-filtering. Error: {error_msg}")
            # Step B: Fallback to Post-Filtering
            pipeline = get_pipeline(use_pre_filter=False)
            results = await translation_collection.aggregate(pipeline).to_list(length=count)
        else:
            logger.error(f"❌ Vector search aggregation failed: {e}")
            return []

    logger.info(f"Vector search returned {len(results)} results")
    
    # Shuffle the final sub-set to ensure random visual order
    random.shuffle(results)
    
    return results


async def get_random_picture_details(
    count: int,
    language: Optional[str] = None,
    category: Optional[str] = None,
    field_of_study: Optional[str] = None,
    org_id: Optional[str] = None,
    object_ids: Optional[list] = None,
    search_text: Optional[str] = None
) -> list:
    """
    Fetch picture translations.
    If search_text is provided, uses vector search on embedding_vector.
    Otherwise, fetches random translations filtered by metadata.
    
    Optimized to filter by 'embedding_text' in translations collection instead of joining objects collection
    for category/field_of_study filters.
    """
    
    print(f"\n⏰ Inside get_random_picture_details: Requested language: {language}, Org ID: {org_id}")

    # Initialize base queries
    base_query = {"translation_status": "Approved"}

    # 1) Reordered Parameter Priority Logic
    # Only one of these filters will be applied based on priority.
    
    # Priority 1: object_ids
    if object_ids:
        base_query["object_id"] = {"$in": object_ids}
        group_key = "$object_id"
        logger.info(f"Priority 1: Filtering by explicit object_ids: {len(object_ids)} IDs")
    

    # Priority 2: field_of_study (optimized fuzzy match)
    elif field_of_study:
        # Translate field_of_study to target language if provided
        actual_fos = field_of_study
        if language:
            logger.info(f"Translating field_of_study '{field_of_study}' to {language}")
            actual_fos = await translate_text(field_of_study, language)
        
        base_query["embedding_text"] = {"$regex": re.escape(actual_fos), "$options": "i"}
        group_key = "$object_name"
        logger.info(f"Priority 3: Filtering by field_of_study '{actual_fos}' (translated from '{field_of_study}') in embedding_text")
        
    # Priority 3: category (optimized fuzzy match)
    elif category:
        # Translate category to target language if provided
        actual_cat = category
        if language:
            logger.info(f"Translating category '{category}' to {language}")
            actual_cat = await translate_text(category, language)
            
        base_query["embedding_text"] = {"$regex": re.escape(actual_cat), "$options": "i"}
        group_key = "$object_name"
        logger.info(f"Priority 4: Filtering by category '{actual_cat}' (translated from '{category}') in embedding_text")
    
    # Priority 4: search_text (Vector Search)
    elif search_text:
        logger.info(f"Priority 2: Performing vector search for '{search_text}'")
        return await get_vector_search_results(count, search_text, language, org_id)
        
    else:
        # Default: Random matching
        group_key = "$object_name"
        logger.info("No specific filter provided → fetching random pictures")

    # 2) Apply common filters (Org entry and Language)
    if org_id:
        base_query["org_id"] = org_id
    else:
        base_query["$or"] = [
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""}
        ]

    if language:
        base_query["requested_language"] = language
    
    print("\n^^^^^^^^^^base_query: ", base_query)


    # 6) Count distinct items
    # Extract field name from group_key (strip leading $)
    distinct_field = group_key.lstrip("$")
    distinct_items = await translation_collection.distinct(distinct_field, base_query)


    total = len(distinct_items)
    print("\nTotal distinct items after filters: ", total)
    logger.info(f"Total distinct items after filters: {total}")

    if total == 0:
        logger.warning("No translation documents found for given filters.")
        return []

    if total < count:
        logger.info(f"Requested {count} but only {total} available. Reducing count.")
        count = total

    # 7) Aggregation
    pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": group_key,
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
