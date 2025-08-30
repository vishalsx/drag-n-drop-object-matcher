import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()  # load .env file if exists

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
DB_NAME = os.getenv("MONGODB_DBNAME", "alphatubplay")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

print (f"Connected to MongoDB at {MONGODB_URI}, using database '{DB_NAME}'")

# Collections
# pictures_collection = db[os.getenv("MONGODB_PICTURES_COLLECTION", "PublicPictures")]
MONGODB_OBJECTS_COLLECTION=os.getenv("MONGODB_OBJECTS_COLLECTION", "objects")
objects_collection = db[MONGODB_OBJECTS_COLLECTION]

MONGODB_TRANSLATION_COLLECTION=os.getenv("MONGODB_TRANSLATION_COLLECTION", "translations")
translation_collection = db[MONGODB_TRANSLATION_COLLECTION]
print (f"Using collections: '{MONGODB_OBJECTS_COLLECTION}', '{MONGODB_TRANSLATION_COLLECTION}'")

