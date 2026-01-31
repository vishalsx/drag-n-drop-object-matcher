import asyncio
from app.database import participants_collection, contests_collection, users_collection
from bson import ObjectId

async def check():
    beamer = await participants_collection.find_one({"username": "beamer"})
    print(f"Participant beamer exists: {beamer is not None}")
    
    beamer_user = await users_collection.find_one({"username": "beamer"})
    print(f"User beamer exists: {beamer_user is not None}")
    
    contest = await contests_collection.find_one({})
    if contest:
        print(f"Contest ID: {str(contest['_id'])}")
    else:
        print("No contests found")

if __name__ == "__main__":
    asyncio.run(check())
