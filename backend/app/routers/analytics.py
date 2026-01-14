from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List, Optional
from datetime import datetime
import uuid

from app.analytics_models import (
    ContestAttemptAnalytics,
    ContestAttemptAnalyticsResponse
)
from app.database import contest_analytics_collection


router = APIRouter(prefix="/analytics", tags=["contest analytics"])


def generate_attempt_id() -> str:
    """Generate a unique attempt ID"""
    date_str = datetime.utcnow().strftime("%Y%m%d")
    random_str = str(uuid.uuid4())[:8].upper()
    return f"ATT-{date_str}-{random_str}"


@router.post("/contest-attempt", response_model=ContestAttemptAnalyticsResponse)
async def submit_contest_analytics(
    payload: ContestAttemptAnalytics,
    request: Request
):
    print(f"\n\n>>> [BACKEND ANALYTICS] Incoming request to /contest-attempt")
    print(f">>> Headers: {dict(request.headers)}")
    try:
        # Extract user_id from request state (set by middleware/auth)
        user_info = getattr(request.state, "user", None)
        authenticated_user_id = None
        
        if user_info:
            authenticated_user_id = (
                user_info.get("username") or 
                user_info.get("sub") or 
                user_info.get("user_id")
            )
        
        print(f"\n\n=== DEBUG: Analytics Submission ===")
        print(f"Authenticated User: {authenticated_user_id}")
        print(f"Payload User: {payload.user_id}")
        print(f"Contest ID: {payload.contest_id}")
        
        # Security: Verify that payload user_id matches authenticated user
        if not authenticated_user_id:
            print("ERROR: No authenticated user found in request state")
            raise HTTPException(
                status_code=401,
                detail="Authentication required to submit analytics"
            )
        
        if payload.user_id != authenticated_user_id:
            print(f"ERROR: User ID mismatch. Auth: {authenticated_user_id}, Payload: {payload.user_id}")
            raise HTTPException(
                status_code=403,
                detail="Cannot submit analytics for another user"
            )
        
        # Generate unique attempt ID
        attempt_id = generate_attempt_id()
        
        # Prepare document for insertion
        doc = payload.model_dump(exclude={"attempt_id"})
        doc["attempt_id"] = attempt_id
        doc["created_at"] = datetime.utcnow()
        
        print(f"Attempt ID: {attempt_id}")
        print(f"Inserting document for contest: {payload.contest_id}")
        
        # Insert into database
        result = await contest_analytics_collection.insert_one(doc)
        
        print(f"Insertion result: {result.inserted_id}")
        print(f"=== DEBUG END ===\n\n")
        
        return ContestAttemptAnalyticsResponse(
            success=True,
            attempt_id=attempt_id,
            message="Analytics submitted successfully"
        )
    
    except HTTPException as he:
        print(f"HTTP Error in analytics: {he.detail}")
        raise
    except Exception as e:
        print(f"Unexpected error in analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit analytics: {str(e)}"
        )


@router.get("/contest/{contest_id}/user/{user_id}", response_model=List[dict])
async def get_user_contest_analytics(
    contest_id: str,
    user_id: str,
    request: Request
):
    """
    Retrieve all analytics attempts for a specific user in a contest.
    
    Security: Users can only view their own analytics unless they have admin privileges.
    """
    try:
        # Extract authenticated user
        user_info = getattr(request.state, "user", None)
        authenticated_user_id = None
        
        if user_info:
            authenticated_user_id = (
                user_info.get("username") or 
                user_info.get("sub") or 
                user_info.get("user_id")
            )
        
        # Security check: user can only view their own analytics
        # TODO: Add admin role check to allow admins to view any user's analytics
        if authenticated_user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own analytics"
            )
        
        # Query database
        query = {
            "contest_id": contest_id,
            "user_id": user_id
        }
        
        cursor = contest_analytics_collection.find(query).sort("started_at", -1)
        results = []
        
        async for doc in cursor:
            # Convert ObjectId to string for JSON serialization
            doc["_id"] = str(doc["_id"])
            results.append(doc)
        
        return results
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve analytics: {str(e)}"
        )


@router.get("/contest/{contest_id}/summary")
async def get_contest_summary(
    contest_id: str,
    request: Request
):
    """
    Get aggregate analytics summary for a contest.
    
    Returns statistics like:
    - Total attempts
    - Average score
    - Average completion time
    - Completion rate
    - Common behavioral patterns
    
    TODO: Add admin authentication requirement
    """
    try:
        # TODO: Add admin role verification
        # For now, this endpoint is open (should be restricted in production)
        
        pipeline = [
            {"$match": {"contest_id": contest_id}},
            {
                "$group": {
                    "_id": "$contest_id",
                    "total_attempts": {"$sum": 1},
                    "completed_attempts": {
                        "$sum": {"$cond": [{"$eq": ["$round_status", "completed"]}, 1, 0]}
                    },
                    "avg_score": {"$avg": "$score_achieved"},
                    "avg_time_seconds": {"$avg": "$total_time_seconds"},
                    "total_users": {"$addToSet": "$user_id"}
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "contest_id": "$_id",
                    "total_attempts": 1,
                    "completed_attempts": 1,
                    "completion_rate": {
                        "$cond": [
                            {"$eq": ["$total_attempts", 0]},
                            0,
                            {"$divide": ["$completed_attempts", "$total_attempts"]}
                        ]
                    },
                    "avg_score": {"$round": ["$avg_score", 2]},
                    "avg_time_seconds": {"$round": ["$avg_time_seconds", 2]},
                    "unique_users": {"$size": "$total_users"}
                }
            }
        ]
        
        cursor = contest_analytics_collection.aggregate(pipeline)
        results = []
        async for doc in cursor:
            results.append(doc)
        
        if not results:
            return {
                "contest_id": contest_id,
                "total_attempts": 0,
                "completed_attempts": 0,
                "completion_rate": 0,
                "avg_score": 0,
                "avg_time_seconds": 0,
                "unique_users": 0
            }
        
        return results[0]
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )
