from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Literal
from hashlib import sha256
from datetime import datetime
from pymongo import MongoClient, ReturnDocument
import os
from dotenv import load_dotenv
from app.database import translation_collection, votes_collection
from bson import ObjectId


# FastAPI router
router = APIRouter()

# Request model
class VoteRequest(BaseModel):
    translation_id: str
    vote_type: Literal["up", "down"]  # Only "up" or "down"

@router.post("/vote")
async def record_vote(vote_req: VoteRequest, request: Request):
    
    body = await request.json()
    print("DEBUG incoming body:", body)
    
    """
    Record a vote for a translation. Prevent multiple votes from the same IP.
    """
    # Get client IP
    client_host = request.client.host
    ip_hash = sha256(client_host.encode("utf-8")).hexdigest()  # hash for privacy

    print (f"\nip address:{client_host},IP address hash: {ip_hash}")
    # Check if this IP already voted for this translation
    try:
        existing_vote = await votes_collection.find_one({
            "translation_id": vote_req.translation_id,
            "ip_hash": ip_hash
        })
    except Exception as e:
     print("Failed in exception:", e)
    
    if existing_vote:
        return {"error": "Thanks! your vote is already counted."}
    print(f"\nExisting or not : {existing_vote}")
    # Record the vote in votes_collection
    await votes_collection.insert_one({
        "translation_id": vote_req.translation_id,
        "ip_hash": ip_hash,
        "vote_type": vote_req.vote_type,
        "timestamp": datetime.utcnow()
    })

    # Atomically increment the vote count in translation_collection
    field_to_increment = "up_votes" if vote_req.vote_type == "up" else "down_votes"

    updated_translation = await translation_collection.find_one_and_update(
        {"_id": ObjectId(vote_req.translation_id)},
        {"$inc": {field_to_increment: 1}},
        return_document=ReturnDocument.AFTER
    )

    if not updated_translation:
        raise HTTPException(status_code=404, detail="Something went wrong at our end. Can't vote right now!")

    # Return current totals
    return {
        "translation_id": vote_req.translation_id,
        "up_votes": updated_translation.get("up_votes", 0),
        "down_votes": updated_translation.get("down_votes", 0)
    }
