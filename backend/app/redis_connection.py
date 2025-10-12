import os
from dotenv import load_dotenv
# import redis.asyncio as redis  # ✅ async version

# load_dotenv()




# REDIS_HOST = os.getenv("REDIS_HOST")
# REDIS_PORT = os.getenv("REDIS_PORT")
# REDIS_USERNAME = os.getenv("REDIS_USERNAME")
# REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

# REDIS_URL = f"rediss://{REDIS_USERNAME}:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}"




# redis_client = redis.Redis(
#     host=REDIS_HOST,
#     port=REDIS_PORT,
#     password=REDIS_PASSWORD,
#     username=REDIS_USERNAME,
#     # ssl=True,  # ✅ Enables TLS
#     decode_responses=True,
# )




# # ---------- Configurations for local server----------
# # REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
# # redis_client = redis.from_url(REDIS_URL, decode_responses=True)



from upstash_redis import Redis

load_dotenv()
TTS_CACHE_TTL = int(os.getenv("TTS_CACHE_TTL", 7 * 24 * 60 * 60))
url = os.getenv("UPSTASH_REDIS_REST_URL", "https://liked-gobbler-6469.upstash.io")
token= os.getenv("UPSTASH_REDIS_REST_TOKEN")

redis_client = Redis(url="https://liked-gobbler-6469.upstash.io", token="ARlFAAImcDIxZjMyYjFhNzY4MWM0NWIyYmY2ZWJiYjkxN2Q0NTRmYXAyNjQ2OQ")
