from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from gtts import gTTS
import base64
import io
import redis.asyncio as redis  # async Redis client
import hashlib
import os
from dotenv import load_dotenv

# ---------- Load environment variables ----------
load_dotenv()

# ---------- Configurations ----------
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
TTS_CACHE_TTL = int(os.getenv("TTS_CACHE_TTL", 7 * 24 * 60 * 60))  # default 7 days

# ---------- FastAPI app ----------
# app = FastAPI(title="Cloud Text-to-Speech API with Redis Cache")

router = APIRouter(prefix="", tags=["pictures"])
# ---------- Redis connection ----------
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# ---------- Request schema ----------
class TTSRequest(BaseModel):
    text: str
    languageCode: str = "en"

# ---------- Helper functions ----------
def _generate_cache_key(text: str, lang: str) -> str:
    """Generate a stable SHA256-based Redis cache key."""
    key_hash = hashlib.sha256(f"{lang}:{text}".encode("utf-8")).hexdigest()
    return f"tts:{lang}:{key_hash}"

async def _generate_tts_audio(text: str, language: str) -> str:
    """Generate Base64-encoded MP3 audio using gTTS."""
    tts = gTTS(text=text, lang=language)
    audio_stream = io.BytesIO()
    tts.write_to_fp(audio_stream)
    audio_stream.seek(0)
    audio_base64 = base64.b64encode(audio_stream.read()).decode("utf-8")
    return f"data:audio/mpeg;base64,{audio_base64}"

# ---------- API endpoint ----------
@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """
    Converts input text to speech using gTTS.
    Results are cached in Redis for configurable TTL.
    """
    text = req.text.strip()
    language = req.languageCode.split('-')[0]  # normalize like 'en-US' → 'en'

    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    cache_key = _generate_cache_key(text, language)

    # 1️⃣ Try to fetch from Redis cache
    cached_audio = await redis_client.get(cache_key)
    if cached_audio:
        return {"audioBase64": cached_audio, "cached": True}

    try:
        # 2️⃣ Generate new TTS
        audio_data_uri = await _generate_tts_audio(text, language)

        # 3️⃣ Store in Redis with TTL from .env
        await redis_client.set(cache_key, audio_data_uri, ex=TTS_CACHE_TTL)

        return {"audioBase64": audio_data_uri, "cached": False}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")
