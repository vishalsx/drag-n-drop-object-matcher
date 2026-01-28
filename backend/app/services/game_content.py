from app.database import translation_collection, objects_collection
from app.services.randompicdetails import get_random_picture_details
from app.routers.languages import translate_text
import logging
from typing import Optional, List, Dict, Any
from app.contest_config import RoundStructure
from bson import ObjectId
import math
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



async def fetch_level_content(
    level_game_type: str,
    round_structure: RoundStructure,
    language: str,
    org_id: Optional[str] = None,
    category: Optional[str] = None,
    field_of_study: Optional[str] = None,
    assigned_object_ids: Optional[List[str]] = None,
    areas_of_interest: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    print(f"[DEBUG-Backend] fetch_level_content: type={level_game_type}, lang={language}, org={org_id}, cat={category}, fos={field_of_study}")
    """
    Orchestrator to fetch content based on game type (matching vs quiz).
    """
    
    if level_game_type == "matching":
        # For matching, we need 'question_count' number of objects
        # The difficulty distribution might implicitly mean how obscure the objects are, 
        # but for now standard 'matching' usually just needs valid objects.
        # We will reuse the logic similar to randompicdetails but tailored for the specific count.
        return await _fetch_matching_objects(
            round_structure=round_structure,
            language=language,
            org_id=org_id,
            category=category,
            field_of_study=field_of_study,
            assigned_object_ids=assigned_object_ids,
            areas_of_interest=areas_of_interest
        )
    
    elif level_game_type == "quiz":
        return await _fetch_quiz_questions(
            round_structure=round_structure,
            language=language,
            org_id=org_id,
            category=category,
            field_of_study=field_of_study,
            assigned_object_ids=assigned_object_ids,
            areas_of_interest=areas_of_interest
        )
    
    else:
        logger.warning(f"Unknown game_type: {level_game_type}")
        return []

# async def _get_valid_object_ids(
#     language: Optional[str] = None,
#     org_id: Optional[str] = None,
#     category: Optional[str] = None,
#     field_of_study: Optional[str] = None,
#     areas_of_interest: Optional[List[str]] = None
# ) -> List[Any]:
#     """
#     Helper to get valid object IDs based on Org ID and Category/FOS filters.
#     Optimized to use translation collection's embedding_text and vector search.
#     """
#     # 1) Initialize base query for translations
#     base_query = {"translation_status": "Approved"}

#     # 2) Apply Org ID logic
#     if org_id:
#         base_query["org_id"] = org_id
#     else:
#         base_query["$or"] = [
#             {"org_id": {"$exists": False}},
#             {"org_id": None},
#             {"org_id": ""},
#         ]

#     # 3) Apply Language filter
#     if language:
#         base_query["requested_language"] = language

#     # 4) Apply Area of Interest (Vector Search)
#     if areas_of_interest:
#         search_query = " ".join([i for i in areas_of_interest if i])
#         if search_query:
#             logger.info(f"Performing vector search for areas_of_interest: {search_query}")
#             # Use a reasonably large count for the pool
#             # get_vector_search_results now handles translation to requested language internally
#             vector_results = await get_vector_search_results(
#                 count=100, 
#                 search_text=search_query, 
#                 language=language, 
#                 org_id=org_id
#             )
#             aoi_object_ids = [r["object_id"] for r in vector_results if "object_id" in r]
#             if aoi_object_ids:
#                 base_query["object_id"] = {"$in": aoi_object_ids}
#             else:
#                 # If vector search specifically returns nothing, return empty
#                 return []

#     # 5) Apply Category/FOS filter on Translations (embedding_text)
#     if category:
#         base_query["embedding_text"] = {"$regex": re.escape(category), "$options": "i"}
#         logger.info(f"Filtering by category: {category}")
#     elif field_of_study:
#         base_query["embedding_text"] = {"$regex": re.escape(field_of_study), "$options": "i"}
#         logger.info(f"Filtering by field_of_study: {field_of_study}")

#     print(f"\n[DEBUG] game_content.py - _get_valid_object_ids")
#     print(f"[DEBUG] game_content.py - Constructed base_query: {base_query}")

#     # 6) Get final matching Translation Object IDs
#     matching_object_ids = await translation_collection.distinct("object_id", base_query)
    
#     # Optional: We might still want to ensure image_status is Approved on the Objects collection
#     # but the user specifically asked to avoid going to object_collection for filters.
#     # However, to be extra safe and ensure we return valid object IDs (and filter out deleted ones if any),
#     # we can do one final distinct on objects_collection filtered by these IDs.
    
#     if not matching_object_ids:
#         return []

#     final_ids = await objects_collection.distinct("_id", {
#         "_id": {"$in": matching_object_ids},
#         "image_status": "Approved"
#     })
    
#     print(f"[DEBUG] game_content.py - Found {len(final_ids)} matching object IDs after image_status check")
    
#     return final_ids

async def _fetch_matching_objects(
    round_structure: RoundStructure,
    language: str,
    org_id: Optional[str] = None,
    category: Optional[str] = None,
    field_of_study: Optional[str] = None,
    assigned_object_ids: Optional[List[str]] = None,
    areas_of_interest: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Fetches objects for matching game.
    Applies hint field mapping based on round_structure.hints_used for contest mode.
    
    Optimized: Uses data from get_random_picture_details directly instead of 
    performing a redundant aggregation on translation_collection.
    """
    count = round_structure.question_count
    hints_used = round_structure.hints_used
    
    if assigned_object_ids:
        # For assigned object IDs, we still need to fetch their translation details
        valid_object_ids = [ObjectId(oid) if isinstance(oid, str) else oid for oid in assigned_object_ids]
        
        # Fetch translation details for assigned objects
        base_query = {
            "translation_status": "Approved",
            "object_id": {"$in": valid_object_ids}
        }
        if language:
            base_query["requested_language"] = language
        if org_id:
            base_query["org_id"] = org_id
        else:
            base_query["$or"] = [
                {"org_id": {"$exists": False}},
                {"org_id": None},
                {"org_id": ""},
            ]
        
        pipeline = [
            {"$match": base_query},
            {"$group": {
                "_id": "$object_name",
                "object_id": {"$first": "$object_id"},
                "object_name": {"$first": "$object_name"},
                "object_description": {"$first": "$object_description"},
                "object_hint": {"$first": "$object_hint"},
                "object_short_hint": {"$first": "$object_short_hint"},
                "translation_id": {"$first": "$_id"},
                "quiz_qa": {"$first": "$quiz_qa"},
                "requested_language": {"$first": "$requested_language"},
            }},
            {"$sample": {"size": count}},
        ]
        results_details = await translation_collection.aggregate(pipeline).to_list(length=count)
    else:
        # Use get_random_picture_details which already returns all needed fields
        search_text = " ".join(areas_of_interest) if areas_of_interest else None
        results_details = await get_random_picture_details(
            count, 
            language, 
            category, 
            field_of_study, 
            org_id, 
            None,
            search_text
        )

    if not results_details:
        return []

    # Apply hint field mapping in-memory based on hints_used
    for result in results_details:
        if hints_used:
            if hints_used == "Long Hints":
                mapped_hint = result.get("object_hint", "")
            elif hints_used == "Short Hints":
                mapped_hint = result.get("object_short_hint", "")
            elif hints_used == "Object Name":
                mapped_hint = result.get("object_name", "")
            else:
                logger.warning(f"Invalid hints_used value: {hints_used}. Using Long Hints as default.")
                mapped_hint = result.get("object_hint", "")
            # Both hint fields use the same source in contest mode
            result["object_hint"] = mapped_hint
            result["object_short_hint"] = mapped_hint
        # else: keep original fields as-is (normal mode)

    # Enrich results with image data from objects collection
    from app.storage.imagestore import retrieve_image
    
    # Extract object IDs for image lookup
    object_ids = []
    for r in results_details:
        oid = r.get("object_id")
        if isinstance(oid, str):
            object_ids.append(ObjectId(oid))
        elif oid is not None:
            object_ids.append(oid)
    
    objects_cursor = objects_collection.find({"_id": {"$in": object_ids}})
    
    objects_map = {}
    async for obj in objects_cursor:
        image_store = obj.get("image_store")
        image_base64 = None
        if image_store:
            try:
                image_base64 = await retrieve_image(image_store)
            except Exception as e:
                logger.error(f"Error retrieving image for object {obj.get('_id')}: {e}")
        
        if not image_base64:
            image_base64 = obj.get("image_base64")
        
        objects_map[str(obj["_id"])] = image_base64
    
    # Add image_base64 to each result and convert ObjectIds to strings
    final_results = []
    for result in results_details:
        # Convert ObjectId fields to strings for JSON serialization
        oid = result.get("object_id")
        result["object_id"] = str(oid) if oid else ""
        
        tid = result.get("translation_id")
        result["translation_id"] = str(tid) if tid else ""
        
        # Add image
        result["image_base64"] = objects_map.get(result["object_id"])
        final_results.append(result)
    
    logger.info(f"[_fetch_matching_objects] Returning {len(final_results)} results for language: {language}")
    return final_results


async def _fetch_quiz_questions(
    round_structure: RoundStructure,
    language: str,
    org_id: Optional[str] = None,
    category: Optional[str] = None,
    field_of_study: Optional[str] = None,
    assigned_object_ids: Optional[List[str]] = None,
    areas_of_interest: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Fetches questions for quiz game based on difficulty distribution.
    Returns a list of Objects, each containing the Image data and a list of selected Questions.
    
    Optimized: Uses quiz_qa from get_random_picture_details directly instead of 
    performing N separate find_one queries on translation_collection.
    """
    logger.info(f"[_fetch_quiz_questions] Fetching for language={language}, assigned_ids={assigned_object_ids}, org={org_id}")

    # Target count from round structure
    target_count = round_structure.object_count if round_structure.object_count else 5
    
    # User Request: In Quiz mode, select random images for each language.
    # Ignoring assigned_object_ids as requested.
    assigned_object_ids = None 

    # Fetch random pictures with all translation data including quiz_qa
    search_text = " ".join(areas_of_interest) if areas_of_interest else None
    results_details = await get_random_picture_details(
        target_count, 
        language, 
        category, 
        field_of_study, 
        org_id, 
        None,
        search_text
    )
    
    if not results_details:
        logger.warning("No valid objects found from get_random_picture_details")
        return []
    
    logger.info(f"[_fetch_quiz_questions] Got {len(results_details)} results from get_random_picture_details")

    # Extract object IDs for image fetching
    object_ids = []
    for r in results_details:
        oid = r.get("object_id")
        if isinstance(oid, str):
            object_ids.append(ObjectId(oid))
        elif oid is not None:
            object_ids.append(oid)

    # Fetch Object Images
    from app.storage.imagestore import retrieve_image
    
    objects_cursor = objects_collection.find({"_id": {"$in": object_ids}})
    objects_map = {}
    async for obj in objects_cursor:
        image_store = obj.get("image_store")
        image_base64 = None
        if image_store:
            try:
                image_base64 = await retrieve_image(image_store)
            except Exception as e:
                logger.error(f"Error retrieving image for object {obj.get('_id')}: {e}")
        
        if not image_base64:
            image_base64 = obj.get("image_base64")
            
        objects_map[str(obj["_id"])] = image_base64
    
    logger.info(f"Fetched images for {len(objects_map)} objects")

    # Calculate question distribution by difficulty
    questions_per_object = round_structure.question_count
    dist = round_structure.difficulty_distribution
    
    total_weight = dist.easy + dist.medium + dist.hard
    if total_weight > 0:
        w_easy = dist.easy / total_weight
        w_medium = dist.medium / total_weight
        w_hard = dist.hard / total_weight
    else:
        w_easy, w_medium, w_hard = 0.33, 0.33, 0.34
        
    c_easy = int(round(questions_per_object * w_easy))
    c_medium = int(round(questions_per_object * w_medium))
    c_hard = int(round(questions_per_object * w_hard))
    
    # Adjust for rounding
    diff = questions_per_object - (c_easy + c_medium + c_hard)
    if diff != 0:
        if c_easy >= c_medium and c_easy >= c_hard: c_easy += diff
        elif c_medium >= c_easy and c_medium >= c_hard: c_medium += diff
        else: c_hard += diff
    
    logger.info(f"Question distribution target: Easy={c_easy}, Medium={c_medium}, Hard={c_hard}")

    # Helper to filter questions by difficulty
    def get_by_diff(pool, diff_name, limit):
        import random
        matches = [q for q in pool if q.get("difficulty_level", "").lower() == diff_name.lower()]
        if len(matches) > limit:
            return random.sample(matches, limit)
        return matches

    # Process each result from get_random_picture_details
    results = []
    
    for translation_data in results_details:
        oid = translation_data.get("object_id")
        oid_str = str(oid) if oid else ""
        
        all_qa = translation_data.get("quiz_qa", [])
        if not all_qa:
            logger.warning(f"Object {oid_str} has no quiz_qa, skipping")
            continue
            
        # Select questions by difficulty
        selected_qa = []
        
        easy_qs = get_by_diff(all_qa, "easy", c_easy)
        medium_qs = get_by_diff(all_qa, "medium", c_medium)
        hard_qs = get_by_diff(all_qa, "hard", c_hard)
        
        selected_qa.extend(easy_qs)
        selected_qa.extend(medium_qs)
        selected_qa.extend(hard_qs)
        
        # Fill up with remaining questions if needed
        if len(selected_qa) < questions_per_object:
            import random
            seen_questions = {q.get("question") for q in selected_qa}
            remaining = [q for q in all_qa if q.get("question") not in seen_questions]
            needed = questions_per_object - len(selected_qa)
            if len(remaining) > needed:
                selected_qa.extend(random.sample(remaining, needed))
            else:
                selected_qa.extend(remaining)
        
        logger.info(f"Object {oid_str}: Selected {len(selected_qa)} questions")
        
        # Construct result item
        tid = translation_data.get("translation_id")
        
        item = {
            "object_id": oid_str,
            "translation_id": str(tid) if tid else "",
            "image_base64": objects_map.get(oid_str),
            "imageName": translation_data.get("object_name", "Unknown"),
            "object_description": translation_data.get("object_description"),
            "questions": selected_qa,
            "requested_language": language
        }
        results.append(item)
    
    logger.info(f"[_fetch_quiz_questions] Returning {len(results)} items for quiz")
    return results
