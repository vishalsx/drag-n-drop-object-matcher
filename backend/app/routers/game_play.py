from fastapi import APIRouter, HTTPException, Query, Path, Depends, Response
from typing import Optional, List, Dict, Any
from app.database import contests_collection, participants_collection
from app.contest_config import Contest
from app.services.game_content import fetch_level_content
from app.routers.auth import get_current_user
from app.contest_participant import Contestant
from bson import ObjectId
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/contest/{contest_id}/play/level/{level_seq}/round/{round_seq}", response_model=List[Dict[str, Any]])
async def get_level_round_content(
    response: Response,
    contest_id: str = Path(..., description="The ID of the contest"),
    level_seq: int = Path(..., description="Sequence number of the level"),
    round_seq: int = Path(..., description="Sequence number of the round"),
    language: str = Query(..., description="Language for the content"),
    category: Optional[str] = Query(None, description="Object category filter"),
    field_of_study: Optional[str] = Query(None, description="Field of study filter"),
    token_user: Dict = Depends(get_current_user)
):
    """
    Fetch content (objects or questions) for a specific round in a contest level.
    The type of content returned depends on the Level's game_type (matching vs quiz).
    Ensures consistency of objects across levels for the same user.
    """
    
    # Fetch full Contestant object from DB using token info
    username = token_user.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token: username missing")

    contestant_doc = await participants_collection.find_one({"username": username})
    if not contestant_doc:
         raise HTTPException(status_code=403, detail="Contestant profile not found")
         
    current_user = Contestant(**contestant_doc)
    
    # 1. Fetch Contest
    try:
        if not ObjectId.is_valid(contest_id):
             raise HTTPException(status_code=400, detail="Invalid contest ID format")
             
        contest_doc = await contests_collection.find_one({"_id": ObjectId(contest_id)})
        if not contest_doc:
            raise HTTPException(status_code=404, detail="Contest not found")
            
        contest = Contest(**contest_doc)
        
    except Exception as e:
        logger.error(f"Error fetching contest {contest_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error fetching contest")

    # 2. Find Level
    level_structure = None
    if contest.game_structure and contest.game_structure.levels:
        for lvl in contest.game_structure.levels:
            if lvl.level_seq == level_seq:
                level_structure = lvl
                break
    
    if not level_structure:
        raise HTTPException(status_code=404, detail=f"Level {level_seq} not found in this contest")

    # 3. Find Round
    round_structure = None
    if level_structure.rounds:
        for rnd in level_structure.rounds:
            if rnd.round_seq == round_seq:
                round_structure = rnd
                break
                
    if not round_structure:
        raise HTTPException(status_code=404, detail=f"Round {round_seq} not found in level {level_seq}")

    # 4. Fetch Content
    try:
        # User specified: No persistence needed between matching and quiz modes.
        # Every round and level should be completely random.
        content = await fetch_level_content(
            level_game_type=level_structure.game_type,
            round_structure=round_structure,
            language=language,
            org_id=contest.org_id,
            category=category,
            field_of_study=field_of_study,
            assigned_object_ids=None
        )
        
        # 5. Add No-Cache headers to ensure browser fetches fresh random content every time
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        return content
        
    except Exception as e:
        logger.error(f"Error fetching game content: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating game content")
