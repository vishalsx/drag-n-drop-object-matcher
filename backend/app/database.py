import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()  # load .env file if exists

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "alphatubplay")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

# Collections
pictures_collection = db[os.getenv("MONGODB_PICTURES_COLLECTION", "PublicPictures")]
