from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
from datetime import datetime, timedelta
from app.event_analytics_models import GameEvent
from app.database import event_analytics_collection, translation_collection

router = APIRouter(prefix="/event-analytics", tags=["event analytics"])

@router.post("/log")
async def log_event(event: GameEvent, request: Request):
    """
    Log an analytics event from the frontend.
    This is an append-only endpoint.
    """
    try:
        # Extract user_info from request state (set by middleware/auth)
        user_info = getattr(request.state, "user", None)
        authenticated_user_id = None
        
        if user_info:
            authenticated_user_id = (
                user_info.get("username") or 
                user_info.get("sub") or 
                user_info.get("user_id")
            )
            
        # Security: Verify that payload user_id matches authenticated user if available
        if authenticated_user_id and event.envelope.user_id != authenticated_user_id:
            raise HTTPException(
                status_code=403,
                detail="Cannot log events for another user"
            )

        # Prepare document for insertion
        # We store the envelope and payload as defined in GameEvent
        # mode="json" ensures UUIDs and datetimes are serialized to strings
        doc = event.model_dump(mode="json")
        doc["received_at"] = datetime.utcnow()
        
        # Insert into database (append-only)
        result = await event_analytics_collection.insert_one(doc)
        
        return {
            "success": True, 
            "event_id": str(event.envelope.event_id),
            "db_id": str(result.inserted_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error logging event: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log event: {str(e)}"
        )

@router.get("/mastery/{language_code}")
async def get_mastery_score(
    language_code: str, 
    request: Request,
    org_code: Optional[str] = Query(None, description="Organization code from URL path")
):
    """
    Calculate and return the mastery score for a user in a specific language.
    Uses aggregation across interaction attempts and hint usage.
    """
    try:
        user_info = getattr(request.state, "user", None)
        if not user_info:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        user_id = user_info.get("username") or user_info.get("sub") or user_info.get("user_id")
        
        # Resolve language name if a code was passed
        from app.database import languages_collection
        lang_doc = await languages_collection.find_one({
            "$or": [
                {"isoCode": language_code},
                {"language_name": {"$regex": f"^{language_code}$", "$options": "i"}}
            ]
        })
        
        # Search language name or isoCode
        search_language = lang_doc.get("language_name") if lang_doc else language_code
        
        # Extract org_id from request state (set by AuthMiddleware)
        org = getattr(request.state, "org", None)
        org_id = org["org_id"] if org else None
        
        # Verify context: If request comes from a non-org context (no org_code), ignore any cached org_id
        # This aligns with the logic in pictures.py
        if not org_code:
            org_id = None
            
        # Build filter for organization content
        if org_id:
            org_filter = {"org_id": org_id}
        else:
            org_filter = {
                "$or": [
                    {"org_id": {"$exists": False}},
                    {"org_id": None},
                    {"org_id": ""}
                ]
            }

        print(f"DEBUG: Mastery Lang: {search_language}, Org: {org_id}, Filter: {org_filter}")

        # Aggregation Pipeline
        async def fetch_mastery_data(uid, lang, org_filt, date_limit=None):
            match_stage = {
                "envelope.user_id": uid,
                "envelope.language": lang
            }
            if date_limit:
                match_stage["envelope.timestamp_iso"] = {"$lt": date_limit.isoformat()}
                
            pipeline = [
                {"$match": match_stage},
                {
                    "$facet": {
                        "level_1": [
                            {
                                "$match": {
                                    "$and": [
                                        {"envelope.event_type": "interaction_attempt"},
                                        {"$or": [{"envelope.level_sequence": 1}, {"envelope.mode": "match"}]}
                                    ]
                                }
                            },
                            {
                                "$group": {
                                    "_id": None,
                                    "total": {"$sum": 1},
                                    "correct": {"$sum": {"$cond": ["$payload.correct", 1, 0]}}
                                }
                            }
                        ],
                        "level_2": [
                            {
                                "$match": {
                                    "$and": [
                                        {"envelope.event_type": "interaction_attempt"},
                                        {"$or": [{"envelope.level_sequence": 2}, {"envelope.mode": "quiz"}]}
                                    ]
                                }
                            },
                            {
                                "$addFields": {
                                    "diff_weight": {
                                        "$switch": {
                                            "branches": [
                                                {"case": {"$eq": ["$payload.difficulty_level", "medium"]}, "then": 1.5},
                                                {"case": {"$eq": ["$payload.difficulty_level", "high"]}, "then": 2.0},
                                                {"case": {"$eq": ["$payload.difficulty_level", "very_high"]}, "then": 3.0}
                                            ],
                                            "default": 1.0 
                                        }
                                    }
                                }
                            },
                            {
                                "$group": {
                                    "_id": None,
                                    "total": {"$sum": 1},
                                    "weighted_total": {"$sum": "$diff_weight"},
                                    "weighted_correct": {
                                        "$sum": {
                                            "$cond": ["$payload.correct", "$diff_weight", 0]
                                        }
                                    }
                                }
                            }
                        ],
                        "hints": [
                            {"$match": {"envelope.event_type": "hint_interaction"}},
                            {
                                "$group": {
                                    "_id": None,
                                    "total_flips": {"$sum": "$payload.flip_count_for_translation"}
                                }
                            }
                        ],
                        "unique_words": [
                            {"$match": {"payload.translation_id": {"$exists": True, "$ne": ""}}},
                            {"$group": {"_id": "$payload.translation_id"}},
                            {
                                "$lookup": {
                                    "from": "translations",
                                    "let": {"tid": "$_id"},
                                    "pipeline": [
                                        {
                                            "$match": {
                                                "$expr": {
                                                    "$eq": ["$_id", {"$toObjectId": "$$tid"}]
                                                },
                                                "translation_status": "Approved",
                                                **org_filt
                                            }
                                        }
                                    ],
                                    "as": "found"
                                }
                            },
                            {"$match": {"found.0": {"$exists": True}}},
                            {"$count": "count"}
                        ]
                    }
                }
            ]
            cursor = event_analytics_collection.aggregate(pipeline)
            res = await cursor.to_list(length=1)
            return res[0] if res else {}

        def compute_mastery_score(data):
            # Hints (Global or Level 1 specific? Assuming Hints apply to Level 1 / Matching generally or global penalty)
            # User request: "20% driven by Hint Independence... part of matching (level 1) score"
            hint_list = data.get("hints", [])
            total_flips = hint_list[0]["total_flips"] if hint_list else 0
            # Hint Penalty: Each flip reduces the independence score.
            # Max independence score is 1.0. 
            hint_penalty = min(1.0, total_flips * 0.05)
            hint_indep = 1.0 - hint_penalty

            # --- LEVEL 1 (Max 40 Points) ---
            # Components: Accuracy (60%), Volume (20%), Hint Independence (20%)
            l1_data = data.get("level_1", [])
            l1_stats = l1_data[0] if l1_data else {"total": 0, "correct": 0}
            
            l1_total = l1_stats["total"]
            l1_score = 0
            
            if l1_total > 0:
                l1_acc = l1_stats["correct"] / l1_total
                # Volume saturation at 50 interactions
                l1_vol = min(1.0, l1_total / 50.0)
                
                # Formula: (Accuracy * 0.60 + Volume * 0.20 + Hint Independence * 0.20) * 40
                l1_score = (l1_acc * 0.60 + l1_vol * 0.20 + hint_indep * 0.20) * 40
            
            # --- LEVEL 2 (Max 60 Points) ---
            # Components: Accuracy (80%), Volume (20%)
            l2_data = data.get("level_2", [])
            l2_stats = l2_data[0] if l2_data else {"total": 0, "weighted_total": 0, "weighted_correct": 0}
            
            l2_total = l2_stats["total"]
            l2_score = 0
            
            if l2_total > 0:
                l2_w_total = l2_stats["weighted_total"]
                l2_w_correct = l2_stats["weighted_correct"]
                l2_acc = l2_w_correct / l2_w_total if l2_w_total > 0 else 0
                
                # Volume saturation at 50 interactions
                l2_vol = min(1.0, l2_total / 50.0)
                
                # Formula: (Accuracy * 0.80 + Volume * 0.20) * 60
                l2_score = (l2_acc * 0.80 + l2_vol * 0.20) * 60
                
            total_interactions = l1_total + l2_total
            final_score = round(l1_score + l2_score)
            
            # Extract words exposed
            exposed_list = data.get("unique_words", [])
            words_exposed = exposed_list[0]["count"] if exposed_list else 0
            
            return min(100, final_score), words_exposed, total_interactions

        # Fetch Current Data
        current_data = await fetch_mastery_data(user_id, search_language, org_filter)
        final_score, words_exposed, _ = compute_mastery_score(current_data)
        
        # Fetch Past Data (7 days ago) to calculate trend
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        past_data = await fetch_mastery_data(user_id, search_language, org_filter, seven_days_ago)
        past_score, _, _ = compute_mastery_score(past_data)
        
        score_change = final_score - past_score
        
        print(f"\n=== MASTERY: {user_id} ({language_code}) ===")
        print(f"Current Score: {final_score}, Past Score: {past_score}, Change: {score_change}")
        
        # Coverage Calculation (Outer Circle)
        # coverage = words exposed / total words available in %
        total_words_query = {
            "requested_language": search_language,
            "translation_status": "Approved"
        }
        
        # Merge org filter
        if org_id:
            total_words_query["org_id"] = org_id
        else:
            total_words_query["$or"] = [
                {"org_id": {"$exists": False}},
                {"org_id": None},
                {"org_id": ""}
            ]
            
        total_words = await translation_collection.count_documents(total_words_query)
        
        coverage_pct = 0
        if total_words > 0:
            coverage_pct = round((words_exposed / total_words) * 100)
            print(f"DEBUG: Coverage Details -> Total: {total_words}, Exposed: {words_exposed}, Result: {coverage_pct}%")
        else:
            print(f"DEBUG: Coverage Details -> Total words is 0 for query: {total_words_query}")

        print(f"TOTAL SCORE: {final_score} | COVERAGE: {coverage_pct}%")
        print("==================================================\n")
        
        return {
            "score": final_score,
            "coverage": coverage_pct,
            "words_exposed": words_exposed,
            "total_words": total_words,
            "change": score_change,
            "period": "last 7 days"
        }
        
    except Exception as e:
        print(f"Error calculating mastery: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate mastery score: {str(e)}"
        )
