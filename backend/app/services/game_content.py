from app.database import translation_collection, objects_collection
import logging
from typing import Optional, List, Dict, Any
from app.contest_config import RoundStructure
from bson import ObjectId
import math

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
    assigned_object_ids: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
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
            assigned_object_ids=assigned_object_ids
        )
    
    elif level_game_type == "quiz":
        return await _fetch_quiz_questions(
            round_structure=round_structure,
            language=language,
            org_id=org_id,
            category=category,
            field_of_study=field_of_study,
            assigned_object_ids=assigned_object_ids
        )
    
    else:
        logger.warning(f"Unknown game_type: {level_game_type}")
        return []

async def _get_valid_object_ids(
    language: Optional[str] = None,
    org_id: Optional[str] = None,
    category: Optional[str] = None,
    field_of_study: Optional[str] = None
) -> List[Any]:
    """
    Helper to get valid object IDs based on Org ID and Category/FOS filters.
    Aligns with randompicdetails.py: Check translations availability FIRST.
    """
    # 1) Initialize base queries
    base_query = {"translation_status": "Approved"}
    object_filter = {"image_status": "Approved"}

    # 2) Apply Org ID logic
    if org_id:
        object_filter["$or"] = [
            {"org_id": org_id},
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""},
        ]
        base_query["org_id"] = org_id
    else:
        object_filter["$or"] = [
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""},
        ]
        base_query["$or"] = [
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""},
        ]

    # 3) Apply Language filter
    if language:
        base_query["requested_language"] = language

    # 4) Apply Category/FOS filter on Objects
    if category:
        object_filter["metadata.object_category"] = category
    elif field_of_study:
        object_filter["metadata.field_of_study"] = field_of_study

    # 5) Get matching Translations first
    # We only want objects that have a valid translation for the requested language/org
    translations_object_ids = await translation_collection.distinct("object_id", base_query)
    
    if not translations_object_ids:
        # No translations found, so no valid objects
        return []

    # 6) Filter Objects based on valid Translation Object IDs
    object_filter["_id"] = {"$in": translations_object_ids}
    
    # 7) Get final matching Object IDs
    matching_object_ids = await objects_collection.distinct("_id", object_filter)
    
    return matching_object_ids

async def _fetch_matching_objects(
    round_structure: RoundStructure,
    language: str,
    org_id: Optional[str] = None,
    category: Optional[str] = None,
    field_of_study: Optional[str] = None,
    assigned_object_ids: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Fetches objects for matching game.
    Applies hint field mapping based on round_structure.hints_used for contest mode.
    """
    count = round_structure.question_count
    hints_used = round_structure.hints_used
    
    if assigned_object_ids:
        valid_object_ids = [ObjectId(oid) if isinstance(oid, str) else oid for oid in assigned_object_ids]
    else:
        valid_object_ids = await _get_valid_object_ids(language, org_id, category, field_of_study)
    
    if not valid_object_ids:
        return []

    # Base query for translations
    base_query = {
        "translation_status": "Approved",
        "object_id": {"$in": valid_object_ids}
    }
    
    if language:
        base_query["requested_language"] = language

    # Org logic for translations
    if org_id:
        base_query["org_id"] = org_id
    else:
        base_query["$or"] = [
            {"org_id": {"$exists": False}},
            {"org_id": None},
            {"org_id": ""},
        ]

    # Determine hint field mapping based on hints_used
    if hints_used:
        if hints_used == "Long Hints":
            hint_field = "$object_hint_raw"
        elif hints_used == "Short Hints":
            hint_field = "$object_short_hint_raw"
        elif hints_used == "Object Name":
            hint_field = "$object_name_raw"
        else:
            logger.warning(f"Invalid hints_used value: {hints_used}. Using Long Hints as default.")
            hint_field = "$object_hint_raw"
        # Both hint fields use the same source  in contest mode
        short_hint_field = hint_field
        logger.info(f"Contest mode - Hint mapping: both fields using {hint_field}")
    else:
        # Normal mode - keep original fields
        hint_field = "$object_hint_raw"
        short_hint_field = "$object_short_hint_raw"

    # Pipeline to deduplicate and sample
    pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": "$object_name",
            "object_id": {"$first": "$object_id"},
            "object_name": {"$first": "$object_name"},
            "object_description": {"$first": "$object_description"},
            "object_hint_raw": {"$first": "$object_hint"},
            "object_short_hint_raw": {"$first": "$object_short_hint"},
            "object_name_raw": {"$first": "$object_name"},
            # In matching, we typically just need the image and name/hint
            "translation_id": {"$first": "$_id"},
            "quiz_qa": {"$first": "$quiz_qa"}, # Included in case needed
            "requested_language": {"$first": "$requested_language"},
        }},
        {"$sample": {"size": count}},
        {"$project": {
            "_id": 0,
            "translation_id": 1,
            "object_id": 1,
            "object_name": "$object_name_raw",
            "object_description": 1,
            "object_hint": hint_field,
            "object_short_hint": short_hint_field,
            "quiz_qa": 1,
            "requested_language": 1
        }}
    ]

    results = await translation_collection.aggregate(pipeline).to_list(length=count)
    
    # Enrich results with image data from objects collection
    if results:
        from app.storage.imagestore import retrieve_image
        
        # Fetch object details for images
        # object_id from aggregation might be ObjectId or string, handle both
        object_ids = []
        for r in results:
            oid = r["object_id"]
            if isinstance(oid, str):
                object_ids.append(ObjectId(oid))
            else:
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
        for result in results:
            # Convert ObjectId fields to strings for JSON serialization
            result["object_id"] = str(result["object_id"])
            result["translation_id"] = str(result["translation_id"])
            
            # Add image
            result["image_base64"] = objects_map.get(result["object_id"])
            # logger.info(f"Enriched object {result['object_id']} with image: {bool(result.get('image_base64'))}")
    
    logger.info(f"[_fetch_matching_objects] Returning {len(results)} random results for language: {language}")
    return results

async def _fetch_quiz_questions(
    round_structure: RoundStructure,
    language: str,
    org_id: Optional[str] = None,
    category: Optional[str] = None,
    field_of_study: Optional[str] = None,
    assigned_object_ids: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Fetches questions for quiz game based on difficulty distribution.
    Returns a list of Objects, each containing the Image data and a list of selected Questions.
    """
    logger.info(f"[_fetch_quiz_questions] Fetching for language={language}, assigned_ids={assigned_object_ids}, org={org_id}")

    # 1. Determine which Objects to use
    
    # Target count from round structure
    target_count = round_structure.object_count if round_structure.object_count else 5
    
    
    # User Request: In Quiz mode, select random images for each language. 
    # Do NOT prevent same images if random chance picks them, but do NOT enforce consistency with assigned_object_ids.
    # Therefore, we effectively ignore assigned_object_ids here and just sample from pool.
    
    # 2026-01-13 Update: Ignoring assigned_object_ids as requested.
    assigned_object_ids = None 

    if assigned_object_ids:
        # Start with assigned objects
        valid_object_ids = [ObjectId(oid) if isinstance(oid, str) else oid for oid in assigned_object_ids]
        logger.info(f"Have {len(valid_object_ids)} assigned object IDs. Target is {target_count}.")
        
        # Logic to match target_count
        if len(valid_object_ids) > target_count:
            # Too many assigned? Sample down to target.
            import random
            valid_object_ids = random.sample(valid_object_ids, target_count)
            logger.info(f"Sampled down to {len(valid_object_ids)} assigned objects.")
            
        elif len(valid_object_ids) < target_count:
            # Too few assigned? Fetch more to fill the gap.
            needed = target_count - len(valid_object_ids)
            logger.info(f"Need {needed} more objects to reach target.")
            
            pool_ids = await _get_valid_object_ids(language, org_id, category, field_of_study)
            
            # Filter out already assigned IDs
            assigned_set = {str(oid) for oid in valid_object_ids}
            candidates = [pid for pid in pool_ids if str(pid) not in assigned_set]
            
            if candidates:
                import random
                # Take what we need, or all available if not enough
                count_to_add = min(len(candidates), needed)
                added_ids = random.sample(candidates, count_to_add)
                valid_object_ids.extend(added_ids)
                logger.info(f"Added {len(added_ids)} new random objects.")
            else:
                logger.warning("No fresh candidates found to fill the count.")

    else:
        # Otherwise, pick random objects
        # Get pool of valid IDs
        pool_ids = await _get_valid_object_ids(language, org_id, category, field_of_study)
        
        if not pool_ids:
            logger.warning("No valid object pool found")
            return []
            
        # Randomly sample 'target_count' objects from the pool
        import random
        if len(pool_ids) > target_count:
            valid_object_ids = random.sample(pool_ids, target_count)
        else:
            valid_object_ids = pool_ids
        logger.info(f"Selected {len(valid_object_ids)} random objects from pool of {len(pool_ids)}")

    if not valid_object_ids:
        return []

    # 2. Fetch Object Details (Images)
    # We need image data (Base64 or URL) for these objects
    from app.storage.imagestore import retrieve_image
    
    objects_cursor = objects_collection.find({"_id": {"$in": valid_object_ids}})
    objects_map = {}
    async for obj in objects_cursor:
        # Fetch image
        image_store = obj.get("image_store")
        image_base64 = None
        if image_store:
            try:
                image_base64 = await retrieve_image(image_store)
            except Exception as e:
                logger.error(f"Error retrieving image for object {obj.get('_id')}: {e}")
        
        if not image_base64:
            image_base64 = obj.get("image_base64")
            
        objects_map[obj["_id"]] = {
            "object_id": str(obj["_id"]),
            "image_base64": image_base64,
            "object_name": obj.get("metadata", {}).get("object_name", "Unknown"), # Fallback or fetch from translation
            "object_category": obj.get("metadata", {}).get("object_category")
        }
    
    logger.info(f"Fetched details for {len(objects_map)} objects")

    # 3. Fetch Questions per Object
    # We need 'question_count' questions per object, distributed by difficulty
    questions_per_object = round_structure.question_count
    dist = round_structure.difficulty_distribution
    
    # Calculate target counts per difficulty
    # dist is typically percentage (0-100) or ratio (0-1). 
    # normalize to 0-1
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
    
    # adjust for rounding
    diff = questions_per_object - (c_easy + c_medium + c_hard)
    if diff != 0:
        # Add to the largest bucket
        if c_easy >= c_medium and c_easy >= c_hard: c_easy += diff
        elif c_medium >= c_easy and c_medium >= c_hard: c_medium += diff
        else: c_hard += diff
    
    logger.info(f"Question distribution target: Easy={c_easy}, Medium={c_medium}, Hard={c_hard}")

    # Perform fetch for each object's translation
    # We use translation_collection to find the text/questions for this object + language
    
    results = []
    
    for oid in valid_object_ids:
        # Find translation for this object & language
        # Similar logic to randompicdetails: filtering by org, language
        query = {
            "object_id": oid,
            "translation_status": "Approved"
        }
        if language:
            query["requested_language"] = language
            
        if org_id:
            query["org_id"] = org_id
        else:
             query["$or"] = [
                {"org_id": {"$exists": False}},
                {"org_id": None},
                {"org_id": ""}
            ]
            
        translation = await translation_collection.find_one(query)
        if not translation:
            logger.warning(f"No translation found for object {oid} in language {language}")
            # Try fallback without org_id if specific org fetch failed? 
            # Or just skip? For now, skip if no translation found.
            continue
            
        all_qa = translation.get("quiz_qa", [])
        if not all_qa:
            logger.warning(f"Translation {translation['_id']} has no quiz_qa")
            continue
            
        # Filter and Select Questions
        selected_qa = []
        
        # Helper to filter by difficulty (case-insensitive)
        def get_by_diff(pool, diff_name, limit):
             matches = [q for q in pool if q.get("difficulty_level", "").lower() == diff_name.lower()]
             import random
             if len(matches) > limit:
                 return random.sample(matches, limit)
             return matches

        easy_qs = get_by_diff(all_qa, "easy", c_easy)
        medium_qs = get_by_diff(all_qa, "medium", c_medium)
        hard_qs = get_by_diff(all_qa, "hard", c_hard)
        
        selected_qa.extend(easy_qs)
        selected_qa.extend(medium_qs)
        selected_qa.extend(hard_qs)
        
        # If we don't have enough questions from preferred difficulties, 
        # fill up with ANY remaining unique questions
        if len(selected_qa) < questions_per_object:
            seen_questions = {q.get("question") for q in selected_qa}
            remaining = [q for q in all_qa if q.get("question") not in seen_questions]
            needed = questions_per_object - len(selected_qa)
            import random
            if len(remaining) > needed:
                selected_qa.extend(random.sample(remaining, needed))
            else:
                selected_qa.extend(remaining)
        
        logger.info(f"Object {oid}: Selected {len(selected_qa)} questions")
        
        # Construct Result Item
        obj_details = objects_map.get(oid, {})
        
        item = {
            "object_id": str(oid),
            "translation_id": str(translation["_id"]),
            "image_base64": obj_details.get("image_base64"),
            "imageName": translation.get("object_name", obj_details.get("object_name")),
            "object_description": translation.get("object_description"),
            "questions": selected_qa,
            "requested_language": language
        }
        results.append(item)
    
    logger.info(f"Returning {len(results)} items for quiz")
    return results
