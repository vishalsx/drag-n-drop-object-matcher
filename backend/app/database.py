import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()  # load .env file if exists

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
DB_NAME = os.getenv("MONGODB_DBNAME", "multilang_db")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

print (f"Connected to MongoDB at {MONGODB_URI}, using database '{DB_NAME}'")


objects_collection = db["objects"]
translation_collection = db["translations"]
votes_collection = db["voting"]
translation_set_collection = db["translation_sets"]
languages_collection = db["languages"]
organisations_collection = db["organisations"]
counters_collection = db["counters"]
contests_collection = db["contests"]
contest_analytics_collection = db["contest_analytics"]
participants_collection = db["participants"]

